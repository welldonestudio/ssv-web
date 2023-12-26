import React from 'react';
import Grid from '@mui/material/Grid';
import {
  useStyles,
} from '~app/components/applications/SSV/RegisterValidatorHome/components/ImportFile/flows/ValidatorList/ValidatorList.styles';
import Typography from '@mui/material/Typography';
import ValidatorSlot
  from '~app/components/applications/SSV/RegisterValidatorHome/components/ImportFile/flows/ValidatorList/ValidatorSlot';

const ValidatorList = ({ validatorsList, countOfValidators }: { validatorsList: any[], countOfValidators: number }) => {
  const classes = useStyles();
  return (
    <Grid className={classes.TableWrapper}>
      <Grid className={classes.TableHeader}>
        <Typography className={classes.HeaderText}>
          Public Key
        </Typography>
      </Grid>
      {validatorsList.map((validator: any, index: number) => <ValidatorSlot key={index}
                                                                            isSelected={index + 1 <= countOfValidators}
                                                                            validatorPublicKey={validator.publicKey}
                                                                            registered={validator.registered}
                                                                            errorMessage={validator.errorMessage}/>)}
    </Grid>
  );
};

export default ValidatorList;