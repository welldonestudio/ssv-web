import Grid from '@mui/material/Grid';
import { observer } from 'mobx-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStores } from '~app/hooks/useStores';
import Button from '~app/components/common/Button';
import LinkText from '~app/components/common/LinkText';
import config, { translations } from '~app/common/config';
import ErrorMessage from '~app/components/common/ErrorMessage';
import BorderScreen from '~app/components/common/BorderScreen';
import SsvAndSubTitle from '~app/components/common/SsvAndSubTitle';
import FundingSummary from '~app/components/common/FundingSummary';
import { useStyles } from './ValidatorRegistrationConfirmation.styles';
import ValidatorKeyInput from '~app/components/common/AddressKeyInput';
import SsvStore from '~app/common/stores/applications/SsvWeb/SSV.store';
import WalletStore from '~app/common/stores/applications/SsvWeb/Wallet.store';
import NameAndAddress from '~app/components/common/NameAndAddress/NameAndAddress';
import ValidatorStore from '~app/common/stores/applications/SsvWeb/Validator.store';
import NewWhiteWrapper from '~app/components/common/NewWhiteWrapper/NewWhiteWrapper';
import ApplicationStore from '~app/common/stores/applications/SsvWeb/Application.store';
import { formatNumberToUi, operatorCostForYear, propertyCostByPeriod } from '~lib/utils/numbers';
import OperatorStore, { IOperator } from '~app/common/stores/applications/SsvWeb/Operator.store';
import ProcessStore, { RegisterValidator, SingleCluster } from '~app/common/stores/applications/SsvWeb/Process.store';
import OperatorDetails
  from '~app/components/applications/SSV/RegisterValidatorHome/components/SelectOperators/components/FirstSquare/components/OperatorDetails/OperatorDetails';

const ValidatorRegistrationConfirmation = () => {
  const stores = useStores();
  const classes = useStyles();
  const navigate = useNavigate();
  const ssvStore: SsvStore = stores.SSV;
  const walletStore: WalletStore = stores.Wallet;
  const processStore: ProcessStore = stores.Process;
  const operatorStore: OperatorStore = stores.Operator;
  const validatorStore: ValidatorStore = stores.Validator;
  const applicationStore: ApplicationStore = stores.Application;
  const [errorMessage, setErrorMessage] = useState('');
  // const [checked, selectCheckBox] = useState(false);
  const process: RegisterValidator | SingleCluster = processStore.process;
  const processFundingPeriod = 'fundingPeriod' in process ? process.fundingPeriod : 0;
  const [actionButtonText, setActionButtonText] = useState('Register Validator');

  const networkCost = propertyCostByPeriod(ssvStore.networkFee, processFundingPeriod);
  const operatorsCost = propertyCostByPeriod(operatorStore.getSelectedOperatorsFee, processFundingPeriod);
  const liquidationCollateralCost = propertyCostByPeriod(operatorStore.getSelectedOperatorsFee + ssvStore.networkFee, ssvStore.liquidationCollateralPeriod);
  const totalAmountOfSsv = formatNumberToUi(networkCost + operatorsCost + liquidationCollateralCost);

  const onRegisterValidatorClick = async () => {
    applicationStore.setIsLoading(true);
    setErrorMessage('');
    setActionButtonText('Waiting for confirmation...');
    // const selectedOperatorsKeys = Object.values(operatorStore.selectedOperators);
    // /* eslint-disable no-await-in-loop */
    // for (let i = 0; i < selectedOperatorsKeys.length; i += 1) {
    //   const operatorValidators = await operatorStore.getOperatorValidatorsCount(selectedOperatorsKeys[i].id);
    //   if (!operatorStore.isOperatorRegistrable(operatorValidators)) {
    //     setErrorMessage(`Operator ${selectedOperatorsKeys[i].name} has reached it’s validator’s limit cap. Please choose a different operator.`);
    //     setActionButtonText('Register Validator');
    //     applicationStore.setIsLoading(false);
    //     return;
    //   }
    // }

    console.log(`mode is: ${validatorStore.registrationMode}`);
    const response = await validatorStore.addNewValidator();
    if (response) {
      operatorStore.unselectAllOperators();
      applicationStore.showTransactionPendingPopUp(false);
      navigate(config.routes.SSV.VALIDATOR.SUCCESS_PAGE);
    } else {
      applicationStore.showTransactionPendingPopUp(false);
      setActionButtonText('Register Validator');
    }
    applicationStore.setIsLoading(false);
  };

  const TotalSection = <Grid container>
    <Grid item xs>
      <NameAndAddress name={'Total'}/>
    </Grid>
    <Grid item style={{ marginBottom: 20 }}>
      <Grid className={classes.TotalSSV}>{'registerValidator' in process ? process.registerValidator?.depositAmount : totalAmountOfSsv} SSV</Grid>
    </Grid>
    {Number(totalAmountOfSsv) > ssvStore.walletSsvBalance && (
        <Grid container item className={classes.InsufficientBalanceWrapper}>
          <Grid item xs>
            Insufficient SSV balance. There is not enough SSV in your wallet.
          </Grid>
          <Grid item>
            <LinkText text={'Need SSV?'} link={'https://faucet.ssv.network'}/>
          </Grid>
        </Grid>
    )}

    {errorMessage && <ErrorMessage text={errorMessage}/>}

    <Grid container>
      <Button
          withAllowance
          text={actionButtonText}
          testId={'confirm-button'}
          onClick={onRegisterValidatorClick}
          disable={Number(totalAmountOfSsv) > ssvStore.walletSsvBalance}
      />
      {/* <CTAButton */}
      {/*  // checkboxesText={[<span>I have read and agreed to the <a target="_blank" href={'www.google.com'}>terms and condition</a></span>]} */}
      {/*  // checkBoxesCallBack={[selectCheckBox]} */}
      {/*  withAllowance */}
      {/*  testId={'confirm-button'} */}
      {/*  disable={false} */}
      {/*  onClick={onRegisterValidatorClick} */}
      {/*  text={actionButtonText} */}
      {/* /> */}
    </Grid>
  </Grid>;

  const screenBody = [<Grid container>
    <Grid item className={classes.SubHeader}>Validator Public Key</Grid>
    <ValidatorKeyInput withBeaconcha address={validatorStore.keyStorePublicKey || validatorStore.keySharePublicKey} />
    <Grid container item xs={12} className={classes.RowWrapper}>
      <Grid item className={classes.SubHeader}>Selected Operators</Grid>
      {Object.values(operatorStore.selectedOperators).map((operator: IOperator, index: number) => {
        const operatorCost = processStore.secondRegistration
            ? operatorCostForYear(walletStore.fromWei(operator.fee))
            : propertyCostByPeriod(walletStore.fromWei(operator.fee), processFundingPeriod);

        const operatorCostPeriod = processStore.secondRegistration ? '/year' : `/${formatNumberToUi(processFundingPeriod, true)} days`;

        return (
            <Grid key={index} container item xs={12} className={classes.Row}>
              <Grid item>
                <OperatorDetails operator={operator}/>
              </Grid>
              <Grid item xs>
                <SsvAndSubTitle
                    ssv={formatNumberToUi(operatorCost)}
                    subText={operatorCostPeriod}
                />
              </Grid>
            </Grid>
        );
      })}
    </Grid>
  </Grid>,
  ];

  if (!processStore.secondRegistration) screenBody.push(<FundingSummary/>);
  if (!processStore.secondRegistration) screenBody.push(TotalSection);

  const MainScreen = <BorderScreen
      blackHeader
      marginTop={32}
      sectionClass={classes.Section}
      header={translations.VALIDATOR.CONFIRMATION.TITLE}
      withoutNavigation={processStore.secondRegistration}
      body={screenBody}
  />;

  const SecondaryScreen = <BorderScreen
      marginTop={16}
      withoutNavigation
      sectionClass={classes.SecondaryScreenSection}
      body={[
          <Grid container>
            <Grid item className={classes.SubHeader}>Transaction Summary</Grid>
            <Grid container style={{ justifyContent: 'space-between' }}>
              <Grid item>
                <NameAndAddress name={'SSV Deposit'} />
              </Grid>
              <Grid item>
                <NameAndAddress name={`${'registerValidator' in process ? process.registerValidator?.depositAmount : 0} SSV`} />
              </Grid>
            </Grid>
          </Grid>,
        TotalSection,
      ]}
  />;

  if (processStore.secondRegistration) {
    return (
        <Grid container>
          <NewWhiteWrapper
              type={0}
              header={'Cluster'}
          />
          <Grid container>
            <Grid item xs={12}>
              {MainScreen}
            </Grid>
            <Grid item xs={12}>
              {SecondaryScreen}
            </Grid>
          </Grid>
        </Grid>
    );
  }

  return MainScreen;
};

export default observer(ValidatorRegistrationConfirmation);
