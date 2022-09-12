import fetch from 'node-fetch'
import * as fs from 'fs'

class GetBankingData {
  async init(urls, user) {
    const optionsPOST = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Client-Id': user.clientId,
        'Client-Secret': user.clientSecret,
        'Bridge-Version': user.bridgeVersion,
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    }
    const token = await this.fetchToken(urls.authURL, optionsPOST)
    const optionsGET = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Client-Id': user.clientId,
        'Client-Secret': user.clientSecret,
        'Bridge-Version': user.bridgeVersion,
        Authorization: 'Bearer ' + token.access_token.value,
      },
    }

    const itemsID = await this.fetchBankItems(urls.itemsURL, optionsGET)
    itemsID.forEach((itemID) => {
      this.fetchAccounts(urls.accountsURL, optionsGET, itemID)
    })
    await this.fetchTransactions(urls.transactionsURL, optionsGET)
  }

  async fetchToken(url, options) {
    const result = await fetch(url, options)
      .then((res) => res.json())
      .then((res) => {
        let { access_token: value, expires_at } = res
        return {
          access_token: {
            value,
            expires_at,
          },
          items: [],
          transactions: [],
        }
      })
      .catch((err) => console.error(err))
    this.createJsonFile(result)
    return result
  }

  async fetchBankItems(url, options) {
    const bankItems = await fetch(url, options)
      .then((res) => res.json())
      .then((res) => {
        const { resources: items } = res
        this.addToJson(items, 'items', '')
        return items
      })
      .catch((err) => console.error(err))
    return bankItems.map((el) => el.id)
  }

  async fetchAccounts(url, options, itemID) {
    const result = await fetch(url + '?item_id=' + itemID + '&limit=null', options)
      .then((res) => res.json())
      .then((res) => {
        const { resources: result } = res
        let accounts = result.map((account) => {
          const {
            id,
            name,
            balance,
            status,
            status_code_info,
            status_code_description,
            updated_at,
            type,
            currency_code,
            iban,
          } = account
          return {
            id,
            name,
            balance,
            status,
            status_code_info,
            status_code_description,
            updated_at,
            type,
            currency_code,
            iban,
          }
        })
        return accounts
      })
      .catch((err) => console.error(err))
    this.addToJson(result, 'accounts', itemID)
    return result
  }

  async fetchTransactions(url, options) {
    const transactionsData = await fetch(url, options)
      .then((res) => res.json())
      .then((res) => {
        const { resources: transactions } = res
        return transactions
      })
      .catch((err) => console.error(err))
    this.addToJson(transactionsData, 'transactions', '')
    return transactionsData
  }

  createJsonFile(data) {
    fs.writeFile('data.json', JSON.stringify(data), (err) => {
      if (err) throw err
      console.log('New data added')
    })
  }

  retrieveJsonData() {
    try {
      let retrieved = fs.readFileSync('data.json')
      return JSON.parse(retrieved)
    } catch (err) {
      console.log('error', err)
    }
  }

  async addToJson(newData, type, itemID) {
    let temp = await this.retrieveJsonData()
    switch (type) {
      case 'items':
        temp.items = newData
        break
      case 'transactions':
        temp['transactions'] = Array.from(newData)
        break
      case 'accounts':
        temp['items'].map((item) => {
          if (item.id === itemID) {
            item.accounts = newData
          }
        })
        break
    }
    this.createJsonFile(temp)
  }
}

const user = {
  email: 'john.doe@email.com',
  password: 'password123',
  clientId: '945a08c761804ac1983536463fc4a7f6',
  clientSecret: 'YqUINh5B5pYlp7UzlENutajikoDX1gIW4pNObUCn9sEXLXGm39Mm1Yq8JKUFaHUD',
  bridgeVersion: '2021-06-01',
}
const urls = {
  authURL: 'https://api.bridgeapi.io/v2/authenticate',
  itemsURL: 'https://api.bridgeapi.io/v2/items',
  accountsURL: 'https://api.bridgeapi.io/v2/accounts',
  transactionsURL: 'https://api.bridgeapi.io/v2/transactions?limit=2',
}
const bankInfoRequest = new GetBankingData()
bankInfoRequest.init(urls, user)
