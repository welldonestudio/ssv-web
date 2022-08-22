import Decimal from 'decimal.js';
import { sha256 } from 'js-sha256';
import { Contract } from 'web3-eth-contract';
import { action, computed, observable } from 'mobx';
import config from '~app/common/config';
import ApiParams from '~lib/api/ApiParams';
import BaseStore from '~app/common/stores/BaseStore';
import WalletStore from '~app/common/stores/Abstracts/Wallet';
import PriceEstimation from '~lib/utils/contract/PriceEstimation';
import ApplicationStore from '~app/common/stores/Abstracts/Application';
import EventStore from '~app/common/stores/applications/SsvWeb/Event.store';
import NotificationsStore from '~app/common/stores/applications/SsvWeb/Notifications.store';
import SsvStore from '~app/common/stores/applications/SsvWeb/SSV.store';

export interface NewOperator {
    id: string,
    fee: number,
    name: string,
    pubKey: string,
    address: string,
}

export interface IOperator {
    id: any,
    fee?: string,
    name: string,
    logo?: string,
    type?: string,
    address: string,
    score?: number,
    public_key: string,
    selected?: boolean,
    dappNode?: boolean,
    ownerAddress: string,
    autoSelected?: boolean
    validatorsCount?: number,
    verified_operator?: boolean,
}

export interface Operators {
    [page: number]: OperatorFee;
}

interface OperatorFee {
    ssv: number,
    dollar: number,
}

interface OperatorsFees {
    [publicKey: string]: OperatorFee;
}

interface SelectedOperators {
    [index: string]: IOperator;
}

class OperatorStore extends BaseStore {
    public static OPERATORS_SELECTION_GAP = 66.66;

    // Process data
    @observable processOperatorId: number | undefined;

    // Cancel dialog switcher
    @observable openCancelDialog: boolean = false;

    @observable operators: IOperator[] = [];
    @observable operatorsFees: OperatorsFees = {};
    @observable selectedOperators: SelectedOperators = {};

    // Operator update fee process
    @observable maxFeeIncrease: number = 0;
    @observable operatorCurrentFee: null | number = null;
    @observable operatorFutureFee: null | number = null;
    @observable getSetOperatorFeePeriod: null | number = null;
    @observable operatorApprovalEndTime: null | number = null;
    @observable declaredOperatorFeePeriod: null | number = null;
    @observable operatorApprovalBeginTime: null | number = null;
    
    @observable newOperatorKeys: NewOperator = { name: '', pubKey: '', address: '', fee: 0, id: '0' };
    @observable newOperatorRegisterSuccessfully: string = '';

    @observable estimationGas: number = 0;
    @observable dollarEstimationGas: number = 0;

    @observable loadingOperators: boolean = false;

    @observable operatorValidatorsLimit: number = 2000;

    @computed
    get getSelectedOperatorsFee(): number {
        const walletStore: WalletStore = this.getStore('Wallet');
        return Object.values(this.selectedOperators).reduce(
            (previousValue: number, currentValue: IOperator) => previousValue + walletStore.fromWei(currentValue.fee),
            0,
        );
    }

    /**
     * Check if selected necessary minimum of operators
     */
    @computed
    get selectedEnoughOperators(): boolean {
        return this.stats.selected >= config.FEATURE.OPERATORS.SELECT_MINIMUM_OPERATORS;
    }

    /**
     * Get selection stats
     */
    @computed
    get stats(): { total: number, selected: number, selectedPercents: number } {
        const selected = Object.values(this.selectedOperators).length;
        return {
            selected,
            total: this.operators.length,
            selectedPercents: ((selected / this.operators.length) * 100.0),
        };
    }

    /**
     * Check if operator registrable
     */
    @action.bound
    isOperatorRegistrable(validatorsRegisteredCount: number) {
        // eslint-disable-next-line radix
        return this.operatorValidatorsLimit > validatorsRegisteredCount;
    }

    /**
     * Check if operator registrable
     */
    @action.bound
    switchCancelDialog() {
        this.openCancelDialog = !this.openCancelDialog;
    }

    /**
     * Check if operator registrable
     */
    @action.bound
    async initUser() {
        const walletStore: WalletStore = this.getStore('Wallet');
        const contract: Contract = walletStore.getContract;
        this.getSetOperatorFeePeriod = await contract.methods.getExecuteOperatorFeePeriod().call();
        this.declaredOperatorFeePeriod = await contract.methods.getDeclaredOperatorFeePeriod().call();
        this.maxFeeIncrease = Number(await walletStore.getContract.methods.getOperatorFeeIncreaseLimit().call()) / 100;
    }

    /**
     * Check if operator registrable
     */
    @action.bound
    clearSettings() {
        this.maxFeeIncrease = 0;
        this.operatorFutureFee = null;
        this.operatorCurrentFee = null;
        this.getSetOperatorFeePeriod = null;
        this.operatorApprovalEndTime = null;
        this.declaredOperatorFeePeriod = null;
        this.operatorApprovalBeginTime = null;
        this.clearOperatorData();
    }

    /**
     * Check if operator registrable
     */
    @action.bound
    async getOperatorFeeInfo(operatorId: number) {
        const walletStore: WalletStore = this.getStore('Wallet');
        const contract: Contract = walletStore.getContract;
        this.operatorCurrentFee = await contract.methods.getOperatorFee(operatorId).call();
        const response = await contract.methods.getOperatorDeclaredFee(operatorId).call();
        this.operatorFutureFee = response['0'] === '0' ? null : response['0'];
        this.operatorApprovalBeginTime = response['1'] === '1' ? null : response['1'];
        this.operatorApprovalEndTime = response['2'] === '2' ? null : response['2'];
    }

    /**
     * get validators per operator limit
     */
    @action.bound
    async validatorsPerOperatorLimit(): Promise<any> {
        // return new Promise((resolve) => {
        //     const walletStore: WalletStore = this.getStore('Wallet');
        //     const contract: Contract = walletStore.getContract;
        //     contract.methods.getValidatorsPerOperatorLimit().call().then((response: any) => {
        //         this.operatorValidatorsLimit = parseInt(response, 10);
        //         resolve(true);
        //     }).catch(() => resolve(true));
        // });
    }

    /**
     * Cancel change fee process for operator
     */
    @action.bound
    async cancelChangeFeeProcess(operatorId: number): Promise<any> {
        return new Promise((resolve) => {
            try {
                const walletStore: WalletStore = this.getStore('Wallet');
                const applicationStore: ApplicationStore = this.getStore('Application');
                const contract: Contract = walletStore.getContract;
                contract.methods.cancelDeclaredOperatorFee(operatorId).send({ from: walletStore.accountAddress })
                    .on('receipt', (receipt: any) => {
                        // eslint-disable-next-line no-prototype-builtins
                        const event: boolean = receipt.hasOwnProperty('events');
                        if (event) {
                            ApiParams.initStorage(true);
                            applicationStore.setIsLoading(false);
                            console.debug('Contract Receipt', receipt);
                            setTimeout(() => {
                                applicationStore.showTransactionPendingPopUp(false);
                                resolve(true);
                            }, 60000);
                        }
                    })
                    .on('transactionHash', (txHash: string) => {
                        applicationStore.txHash = txHash;
                        applicationStore.showTransactionPendingPopUp(true);
                    })
                    .on('error', () => {
                        applicationStore.setIsLoading(false);
                        applicationStore.showTransactionPendingPopUp(false);
                        resolve(false);
                    });
            } catch (e) {
                resolve(false);
            }
        });
    }

    /**
     * get validators of operator
     */
    @action.bound
    async getOperatorValidatorsCount(operatorId: number): Promise<any> {
        return new Promise((resolve) => {
            const walletStore: WalletStore = this.getStore('Wallet');
            const contract: Contract = walletStore.getContract;
            contract.methods.validatorsPerOperatorCount(operatorId).call().then((response: any) => {
                resolve(response);
            });
        });
    }

    /**
     * clear operator store
     */
    @action.bound
    clearOperatorData() {
        this.newOperatorKeys = {
            fee: 0,
            id: '0',
            name: '',
            pubKey: '',
            address: '',
        };
        this.newOperatorRegisterSuccessfully = '';
    }

    /**
     * Set operator keys
     * @param publicKey
     */
    @action.bound
    async getOperatorFee(publicKey: string): Promise<any> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            try {
                const walletStore: WalletStore = this.getStore('Wallet');
                const contract: Contract = walletStore.getContract;
                contract.methods.getOperatorFee(publicKey).call().then((response: any) => {
                    const ssv = walletStore.fromWei(response);
                    this.operatorsFees[publicKey] = { ssv, dollar: 0 };
                    resolve(ssv);
                });
            } catch {
                this.operatorsFees[publicKey] = { ssv: 0, dollar: 0 };
                resolve(0);
            }
        });
    }

    /**
     * Set operator keys
     * @param transaction
     */
    @action.bound
    setOperatorKeys(transaction: NewOperator) {
        this.newOperatorKeys = transaction;
    }

    /**
     * Get operator revenue
     */
    @action.bound
    async getOperatorRevenue(operatorId: number): Promise<any> {
        try {
            const walletStore: WalletStore = this.getStore('Wallet');
            const networkContract = walletStore.getContract;
            const response = await networkContract.methods.totalEarningsOf(operatorId).call();
            return walletStore.fromWei(response.toString());
        } catch (e: any) {
            return 0;
        }
    }

    /**
     * Check if operator already exists in the contract
     * @param operatorId
     * @param newFee
     */
    @action.bound
    async updateOperatorFee(operatorId: number, newFee: any): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            try {
                const ssvStore: SsvStore = this.getStore('SSV');
                const walletStore: WalletStore = this.getStore('Wallet');
                const applicationStore: ApplicationStore = this.getStore('Application');
                const contractInstance = walletStore.getContract;
                const formattedFee = ssvStore.prepareSsvAmountToTransfer(walletStore.toWei(new Decimal(newFee).dividedBy(config.GLOBAL_VARIABLE.BLOCKS_PER_YEAR).toFixed().toString()));
                await contractInstance.methods.declareOperatorFee(operatorId, formattedFee).send({ from: walletStore.accountAddress })
                    .on('receipt', (receipt: any) => {
                        // eslint-disable-next-line no-prototype-builtins
                        const event: boolean = receipt.hasOwnProperty('events');
                        if (event) {
                            applicationStore.setIsLoading(false);
                            setTimeout(() => {
                                applicationStore.showTransactionPendingPopUp(false);
                                resolve(true);
                            }, 60000);
                        }
                    })
                    .on('transactionHash', (txHash: string) => {
                        applicationStore.txHash = txHash;
                        applicationStore.showTransactionPendingPopUp(true);
                    })
                    .on('error', (error: any) => {
                        console.debug('Contract Error', error.message);
                        applicationStore.setIsLoading(false);
                        applicationStore.showTransactionPendingPopUp(false);
                        resolve(false);
                    });
            } catch (e) {
                console.log('<<<<<<<<<<<<<<error>>>>>>>>>>>>>>');
                console.log(e.message);
                resolve(false);
            }
        });
    }

    /**
     * Check if operator already exists in the contract
     * @param operatorId
     * @param newFee
     */
    @action.bound
    async approveOperatorFee(operatorId: number): Promise<boolean> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            try {
                const walletStore: WalletStore = this.getStore('Wallet');
                const applicationStore: ApplicationStore = this.getStore('Application');
                await walletStore.getContract.methods.executeOperatorFee(operatorId).send({ from: walletStore.accountAddress })
                    .on('receipt', (receipt: any) => {
                        // eslint-disable-next-line no-prototype-builtins
                        const event: boolean = receipt.hasOwnProperty('events');
                        if (event) {
                            applicationStore.setIsLoading(false);
                            setTimeout(() => {
                                applicationStore.showTransactionPendingPopUp(false);
                                resolve(true);
                            }, 60000);
                        }
                    })
                    .on('transactionHash', (txHash: string) => {
                        applicationStore.txHash = txHash;
                        applicationStore.showTransactionPendingPopUp(true);
                    })
                    .on('error', (error: any) => {
                        console.debug('Contract Error', error.message);
                        applicationStore.setIsLoading(false);
                        applicationStore.showTransactionPendingPopUp(false);
                        resolve(false);
                    });
            } catch (e) {
                console.log('<<<<<<<<<<<<<<error>>>>>>>>>>>>>>');
                console.log(e.message);
                resolve(false);
            }
        });
    }

    /**
     * Remove Operator
     * @param operatorId
     */
    @action.bound
    async removeOperator(operatorId: number): Promise<any> {
        const notificationsStore: NotificationsStore = this.getStore('Notifications');
        const applicationStore: ApplicationStore = this.getStore('Application');
        try {
            const walletStore: WalletStore = this.getStore('Wallet');
            const contractInstance = walletStore.getContract;

            // eslint-disable-next-line no-async-promise-executor
            return await new Promise(async (resolve) => {
                await contractInstance.methods.removeOperator(operatorId).send({ from: walletStore.accountAddress })
                    .on('receipt', (receipt: any) => {
                        // eslint-disable-next-line no-prototype-builtins
                        const event: boolean = receipt.hasOwnProperty('events');
                        if (event) {
                            ApiParams.initStorage(true);
                            applicationStore.setIsLoading(false);
                            console.debug('Contract Receipt', receipt);
                            setTimeout(() => {
                                applicationStore.showTransactionPendingPopUp(false);
                                resolve(true);
                            }, 60000);
                        }
                    })
                    .on('transactionHash', (txHash: string) => {
                        applicationStore.txHash = txHash;
                        applicationStore.showTransactionPendingPopUp(true);
                    })
                    .on('error', (error: any) => {
                        applicationStore.setIsLoading(false);
                        applicationStore.showTransactionPendingPopUp(false);
                        notificationsStore.showMessage(error.message, 'error');
                        resolve(false);
                    });
            });
        } catch (e) {
            notificationsStore.showMessage(e.message, 'error');
            return false;
        }
    }

    /**
     * Add new operator
     * @param getGasEstimation
     * @param callBack
     */
    @action.bound
    // eslint-disable-next-line no-unused-vars
    async addNewOperator(getGasEstimation: boolean = false) {
        const eventStore: EventStore = this.getStore('Event');
        const applicationStore: ApplicationStore = this.getStore('Application');
        const notificationsStore: NotificationsStore = this.getStore('Notifications');
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                const payload: any[] = [];
                const ssvStore: SsvStore = this.getStore('SSV');
                const walletStore: WalletStore = this.getStore('Wallet');
                const contract: Contract = walletStore.getContract;
                const address: string = this.newOperatorKeys.address;
                const transaction: NewOperator = this.newOperatorKeys;
                const gasEstimation: PriceEstimation = new PriceEstimation();
                const feePerBlock = new Decimal(transaction.fee).dividedBy(config.GLOBAL_VARIABLE.BLOCKS_PER_YEAR).toFixed().toString();

                // Send add operator transaction
                if (process.env.REACT_APP_NEW_STAGE) {
                    payload.push(
                        transaction.name,
                        transaction.pubKey,
                        ssvStore.prepareSsvAmountToTransfer(walletStore.toWei(feePerBlock)),
                    );
                } else {
                    payload.push(
                        transaction.name,
                        transaction.address,
                        transaction.pubKey,
                    );
                }

                console.debug('Register Operator Transaction Data:', payload);
                if (getGasEstimation) {
                    const gasAmount = await this.conditionalContractFunction(contract, payload).estimateGas({ from: walletStore.accountAddress });
                    this.estimationGas = gasAmount * 0.000000001;
                    if (config.FEATURE.DOLLAR_CALCULATION) {
                        const rate = await gasEstimation.estimateGasInUSD(this.estimationGas);
                        this.dollarEstimationGas = this.estimationGas * rate * 0;
                        resolve(true);
                    } else {
                        this.dollarEstimationGas = 0;
                        resolve(true);
                    }
                } else {
                    this.conditionalContractFunction(contract, payload)
                        .send({ from: address })
                        .on('receipt', async (receipt: any) => {
                            // eslint-disable-next-line no-prototype-builtins
                            const events: boolean = receipt.hasOwnProperty('events');
                            if (events) {
                                console.debug('Contract Receipt', receipt);
                                eventStore.send({ category: 'operator_register', action: 'register_tx', label: 'sent' });
                                this.newOperatorKeys.id = receipt.events.OperatorRegistration.returnValues[0];
                                this.newOperatorRegisterSuccessfully = sha256(walletStore.decodeKey(transaction.pubKey));
                                resolve(true);
                            }
                        })
                        .on('transactionHash', (txHash: string) => {
                            applicationStore.txHash = txHash;
                            applicationStore.showTransactionPendingPopUp(true);
                        })
                        .on('error', (error: any) => {
                            // eslint-disable-next-line no-prototype-builtins
                            const isRejected: boolean = error.hasOwnProperty('code');
                            eventStore.send({ category: 'operator_register', action: 'register_tx', label: isRejected ? 'rejected' : 'error' });
                            applicationStore.setIsLoading(false);
                            applicationStore.showTransactionPendingPopUp(false);
                            notificationsStore.showMessage(error.message, 'error');
                            resolve(false);
                        });
                }
            } catch (e) {
                // eslint-disable-next-line prefer-promise-reject-errors
                reject(false);
            }
        });
    }

    /**
     * Unselect operator
     * @param index
     */
    @action.bound
    unselectOperator(index: number) {
        delete this.selectedOperators[index];
    }

    /**
     * Unselect operator by pubkey
     * @param index
     */
    @action.bound
    unselectOperatorByPublicKey(public_key: string) {
        Object.keys(this.selectedOperators).forEach((index) => {
            if (this.selectedOperators[index].address === public_key) {
                delete this.selectedOperators[index];
            }
        });
    }

    /**
     * Select operator
     * @param operator
     * @param selectedIndex
     */
    @action.bound
    selectOperator(operator: IOperator, selectedIndex: number) {
        let operatorExist = false;
        // eslint-disable-next-line no-restricted-syntax
        for (const index of [1, 2, 3, 4]) {
            if (this.selectedOperators[index]?.address === operator.address) {
                operatorExist = true;
            }
        }
        if (!operatorExist) this.selectedOperators[selectedIndex] = operator;
    }

    /**
     * Select operator
     * @param operators
     */
    @action.bound
    selectOperators(operators: IOperator[]) {
        // eslint-disable-next-line no-restricted-syntax
        for (const index of [1, 2, 3, 4]) {
            this.selectedOperators[index] = operators[index - 1];
        }
    }

    /**
     * Check if operator selected
     * @param publicKey
     */
    @action.bound
    isOperatorSelected(id: string): boolean {
        let exist = false;
        Object.values(this.selectedOperators).forEach((operator: IOperator) => {
            if (operator.id === id) exist = true;
        });

        return exist;
    }

    @action.bound
    unselectAllOperators() {
        this.selectedOperators = {};
    }

    conditionalContractFunction(contract: any, payload: any[]) {
        if (process.env.REACT_APP_NEW_STAGE) return contract.methods.registerOperator(...payload);
        return contract.methods.addOperator(...payload);
    }
}

export default OperatorStore;
