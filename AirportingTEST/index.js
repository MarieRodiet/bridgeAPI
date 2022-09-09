import fetch from "node-fetch";
import * as fs from "fs";

class GetBankingData {
  async init() {
    const user = {
      email: "john.doe@email.com",
      password: "password123",
      clientId: "945a08c761804ac1983536463fc4a7f6",
      clientSecret:
        "YqUINh5B5pYlp7UzlENutajikoDX1gIW4pNObUCn9sEXLXGm39Mm1Yq8JKUFaHUD",
      bridgeVersion: "2021-06-01",
    };
    const urls = {
      authURL: "https://api.bridgeapi.io/v2/authenticate",
      itemsURL: "https://api.bridgeapi.io/v2/items",
      accountsURL: "https://api.bridgeapi.io/v2/accounts",
    };

    const token = await this.fetchAccessToken(user, urls);
    const items = await this.fetchBankItems(
      user,
      urls,
      token.access_token.value
    );
    await this.fetchAccounts(user, urls, token.access_token.value, items);

    //les 2 dernières transactions bancaires
  }

  async fetchAccessToken(
    { email, password, clientId, clientSecret, bridgeVersion },
    urls
  ) {
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Client-Id": clientId,
        "Client-Secret": clientSecret,
        "Bridge-Version": bridgeVersion,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    };
    const result = await fetch(urls.authURL, options)
      .then((res) => res.json())
      .then((res) => {
        let {
          access_token: value,
          expires_at,
          user: { uuid },
        } = res;
        return {
          access_token: {
            value,
            expires_at,
          },
          items: [],
          transactions: [],
        };
      });
    this.createJsonFile(result);
    return result;
  }

  async fetchBankItems({ clientId, clientSecret, bridgeVersion }, urls, token) {
    const options = {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Client-Id": clientId,
        "Client-Secret": clientSecret,
        "Bridge-Version": bridgeVersion,
        Authorization: "Bearer " + token,
      },
    };
    const bankItems = await fetch(urls.itemsURL, options)
      .then((res) => res.json())
      .then((res) => {
        const { resources: items } = res;
        this.addItemsJSON(items);
        return items;
      });
    return bankItems.map((el) => el.id);
  }

  async fetchAccounts(
    { clientId, clientSecret, bridgeVersion },
    urls,
    token,
    items
  ) {
    const result = items.forEach((item) => {
      const options = {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Client-Id": clientId,
          "Client-Secret": clientSecret,
          "Bridge-Version": bridgeVersion,
          Authorization: "Bearer " + token,
        },
      };
      const result = fetch(
        urls.accountsURL + "?item_id=" + item + "&limit=null",
        options
      )
        .then((res) => res.json())
        .then((res) => {
          const { resources: accounts } = res;
          this.addAccountsJSON(item, accounts);
          return accounts;
        });
    });
    return result;
  }

  createJsonFile(data) {
    fs.writeFile("data.json", JSON.stringify(data), (err) => {
      if (err) throw err;
      console.log("New data added");
    });
  }

  addItemsJSON(newData) {
    let retrieved = fs.readFileSync("data.json");
    let temp = JSON.parse(retrieved);
    temp["items"] = newData;
    this.createJsonFile(temp);
  }

  addAccountsJSON(itemID, accounts) {
    let retrieved = fs.readFileSync("data.json");
    let temp = JSON.parse(retrieved);
    //find the item with the right id
    //insert the data
    temp["items"].map((item) => {
      if (item.id === itemID) {
        item.accounts = accounts;
      }
    });
    this.createJsonFile(temp);
  }
}

const bankInfoRequest = new GetBankingData();
bankInfoRequest.init();
