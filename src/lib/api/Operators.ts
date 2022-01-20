import config from '~app/common/config';
// import ApiParams from '~lib/api/ApiParams';
import ApiRequest from '~lib/utils/ApiRequest';

// export enum IncentivizedType {
//     // eslint-disable-next-line no-unused-vars
//     operator = 'operator',
//     // eslint-disable-next-line no-unused-vars
//     validator = 'validator',
// }

class Operators {
    private readonly baseUrl: string = '';
    private static instance: Operators;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    static getInstance(): Operators {
        if (!Operators.instance) {
            Operators.instance = new Operators(config.links.EXPLORER_CENTER);
        }
        return Operators.instance;
    }

    static get NETWORK() {
        return 'prater';
    }

    /**
     * Search operators and validators
     * @param query
     */
    async search(query: string) {
        let params: any = {
            query,
            search_for: 'operators',
            network: Operators.NETWORK,
        };
        params = new URLSearchParams(params);
        return new ApiRequest({
            url: `${this.baseUrl}/api/search/?${params.toString()}`,
            method: 'GET',
        }).sendRequest();
    }

    // async fetchOperators(page: number = 1, perPage: number = ApiParams.PER_PAGE) {
    //     let params: any = {
    //         page,
    //         perPage,
    //         network: SearchOperator.NETWORK,
    //     };
    //     params = new URLSearchParams(params);
    //     return new ApiRequest({
    //         url: `${this.baseUrl}/api/operators/?${params.toString()}`,
    //         method: 'GET',
    //     }).sendRequest();
    // }

    // /**
    //  * Fetch one operator by address
    //  * @param operatorAddress
    //  * @param performances
    //  */
    // async fetchOperator(operatorAddress: string, performances: string[] = []) {
    //     let params: any = {
    //         network: SearchOperator.NETWORK,
    //         performances: performances.join(','),
    //     };
    //     params = new URLSearchParams(params);
    //     return new ApiRequest({
    //         url: `${this.baseUrl}/api/operators/${operatorAddress}/?${params.toString()}`,
    //         method: 'GET',
    //     }).sendRequest();
    // }

    // async fetchValidators(page: number = 1, perPage: number = ApiParams.PER_PAGE, detailed = false) {
    //     let params: any = {
    //         page,
    //         perPage,
    //         network: SearchOperator.NETWORK,
    //     };
    //     params = new URLSearchParams(params);
    //     const url = `${this.baseUrl}/api/validators/${detailed ? 'detailed/' : ''}?${params.toString()}`;
    //     return new ApiRequest({
    //         url,
    //         method: 'GET',
    //     }).sendRequest();
    // }

    // /**
    //  * Fetch one operator by address
    //  * @param operatorAddress
    //  * @param page
    //  * @param perPage
    //  */
    // async fetchOperatorValidators(operatorAddress: string, page: number = 1, perPage: number = ApiParams.PER_PAGE) {
    //     let params: any = {
    //         operator: operatorAddress,
    //         page,
    //         perPage,
    //         network: SearchOperator.NETWORK,
    //     };
    //     params = new URLSearchParams(params);
    //     return new ApiRequest({
    //         url: `${this.baseUrl}/api/validators/in_operator/?${params.toString()}`,
    //         method: 'GET',
    //     }).sendRequest();
    // }

    // /**
    //  * Fetch one validator by address
    //  * @param validatorAddress
    //  * @param performances
    //  */
    // async fetchValidator(validatorAddress: string, performances: string[] = []) {
    //     let params: any = {
    //         network: SsvNetwork.NETWORK,
    //         performances: performances.join(','),
    //     };
    //     params = new URLSearchParams(params);
    //     const url = `${this.baseUrl}/api/validators/${validatorAddress}/?${params.toString()}`;
    //     return new ApiRequest({
    //         url,
    //         method: 'GET',
    //     }).sendRequest();
    // }

    // /**
    //  * Get list of duties paginated for validator
    //  * @param validatorAddress
    //  * @param page
    //  * @param perPage
    //  */
    // async fetchValidatorDuties(validatorAddress: string, page = 1, perPage = ApiParams.PER_PAGE) {
    //     let params: any = {
    //         validator: validatorAddress,
    //         page,
    //         perPage,
    //         network: SsvNetwork.NETWORK,
    //     };
    //     params = new URLSearchParams(params);
    //     const url = `${this.baseUrl}/api/validators/duties/?${params.toString()}`;
    //     return new ApiRequest({
    //         url,
    //         method: 'GET',
    //     }).sendRequest();
    // }

//     /**
//      * Get inncetivized stats for operators or validators in given epoch ranges.
//      *
//      * @param type
//      * @param address
//      * @param epochs
//      */
//     async incentivized(type: IncentivizedType | string, address: string | undefined, epochs: string[]) {
//         if (!epochs?.length) {
//             return null;
//         }
//         if (!type) {
//             return null;
//         }
//         let params: any = {
//             [type]: address,
//             network: SsvNetwork.NETWORK,
//             epochs: epochs.join(','),
//         };
//         params = new URLSearchParams(params);
//         return new ApiRequest({
//             url: `${this.baseUrl}/api/${type}s/incentivized/?${params.toString()}`,
//             method: 'GET',
//         }).sendRequest();
//     }
// }
}

export default Operators;