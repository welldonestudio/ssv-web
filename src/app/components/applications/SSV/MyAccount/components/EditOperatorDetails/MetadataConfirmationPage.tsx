import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { useStores } from '~app/hooks/useStores';
import config, { translations } from '~app/common/config';
import HeaderSubHeader from '~app/components/common/HeaderSubHeader';
import GoogleTagManager from '~lib/analytics/GoogleTag/GoogleTagManager';
import ProcessStore from '~app/common/stores/applications/SsvWeb/Process.store';
import { useStyles } from '~app/components/applications/SSV/MyAccount/components/EditOperatorDetails/EditOperatorDetails.styles';
import { SingleOperator } from '~app/model/processes.model';
import { PrimaryButton, SecondaryButton } from '~app/atomicComponents';
import { ButtonSize } from '~app/enums/Button.enum';

const MetadataConfirmationPage = () => {
  const classes = useStyles({});
  const stores = useStores();
  const processStore: ProcessStore = stores.Process;
  const process: SingleOperator = processStore.getProcess;
  const operator = process?.item;
  const navigate = useNavigate();

  const openExplorer = () => {
    GoogleTagManager.getInstance().sendEvent({
      category: 'explorer_link',
      action: 'click',
      label: 'operator'
    });
    window.open(`${config.links.EXPLORER_URL}/operators/${operator.id}`, '_blank');
  };

  const goToDashboard = () => navigate(config.routes.SSV.MY_ACCOUNT.OPERATOR_DASHBOARD);

  return (
    <Grid className={classes.ConfirmationBox}>
      <Grid className={classes.ConfirmationWrapper}>
        <Grid item className={classes.BackgroundImage} />
        <HeaderSubHeader
          marginBottom={13}
          title={translations.OPERATOR_METADATA.CONFIRMATION_CHANGE.TITLE}
          subtitle={translations.OPERATOR_METADATA.CONFIRMATION_CHANGE.SUBTITLE}
        />
        <Grid className={classes.ButtonGroup}>
          <SecondaryButton text={translations.OPERATOR_METADATA.CONFIRMATION_CHANGE.EXPLORER_BUTTON} onClick={openExplorer} size={ButtonSize.XL} />
          <PrimaryButton text={translations.OPERATOR_METADATA.CONFIRMATION_CHANGE.RETURN_TO_MY_ACCOUNT} zIndex={1000} onClick={goToDashboard} size={ButtonSize.XL} />
        </Grid>
      </Grid>
    </Grid>
  );
};

export default MetadataConfirmationPage;
