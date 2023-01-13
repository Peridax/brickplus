const options = {
  time: 10000,
  original: {}
}

const base_settings = {
  item: true,
  special: true,
  quick_purchase: true
}

const user = {
  username: '',
  token: '',
  brickplus: false
}

const item = {
  product: 0,
  owner: 0,
  price: { bucks: 0, bits: 0, offsale: false }
}

//v1 API for the boy jefemy
const url = {
  shop_api: ' https://api.brick-hill.com/v1/shop/list?limit=20&cursor=&search=&verified_designers_only=false&special_only=false&event_only=false&show_unavailable=true&sort=newest',
  item_api: 'https://api.brick-hill.com/v1/shop/',
  brickplus_api: 'https://api.brick-hill.com/v1/shop/14/owners?limit=100&cursor=&',
  test_api: 'https://api.brick-hill.com/v1/shop/list?limit=20&cursor=&search=&types[]=pants&types[]=shirt&types[]=tshirt&verified_designers_only=false&special_only=false&event_only=false&show_unavailable=true&sort=newest',
  shop: 'https://www.brick-hill.com/shop/',
  dashboard: 'https://www.brick-hill.com/dashboard/',
  purchase: 'https://www.brick-hill.com/shop/purchase',
}

chrome.notifications.onClicked.addListener(id => {
  if (id) {
    chrome.tabs.create({ url: url.shop + id })
  }
})

chrome.notifications.onButtonClicked.addListener(async (id, index) => {
  if (id) {
    await get_start_data()

    if (user.username) {
      const get_item = await get_item_data(id)
      const current_item = await get_item

      let currency
      let expected_price

      item.owner = current_item.owner
      item.price.bucks = current_item.bucks
      item.price.bits = current_item.bits
      item.price.offsale = current_item.offsale

      if (item.price.bucks === 0 && item.price.bits === 0) {
        currency = 2
        expected_price = 0
      } else if (item.price.bits === null && item.price.bucks) {
        currency = 0
        expected_price = item.price.bucks
      } else if (item.price.bucks === null && item.price.bits) {
        currency = 1
        expected_price = item.price.bits
      } else if (item.price.bucks && item.price.bits) {
        currency = index
        index === 0 ? expected_price = item.price.bucks : expected_price = item.price.bits
      }

      purchase_item(id, currency, expected_price)
    } else {
      setTimeout(() => {
        chrome.notifications.create('account error', {
          type: "basic",
          title: "Account Error",
          message: "You must be logged in to use this feature",
          iconUrl: "../images/logo128.png"
        })
      }, 1500)
    }
  }
})

const get_latest_shop = async () => {
  try {
    const response = await fetch(url.shop_api)
    const shop_data = await response.json()
    return shop_data
  } catch (err) {
    console.log(err)
  }
}

get_brickplus_owners = async () => {
  try {
    const response = await fetch(url.brickplus_api)
    const shop_data = await response.json()
    return shop_data
  } catch (err) {
    console.log(err)
  }
}

const get_home = async () => {
  try {
    const home_data = await fetch(url.dashboard)
    const html = await home_data.text()
    return html
  } catch (err) {
    console.log(err)
  }
}

const get_shop_item = async id => {
  try {
    const get_shop = await fetch(`${url.shop + id}`)
    const html = get_shop.text()
    return html
  } catch (err) {
    console.log(err)
  }
}

const get_xsrf_token = async () => {
  try {
    const token = await chrome.cookies.get({ url: 'https://www.brick-hill.com', name: 'XSRF-TOKEN' })
    return token
  } catch (err) {
    console.log(err)
  }
}

const get_item_data = async id => {
  try {
    const get_item_api = await fetch(`${url.item_api + id}`)
    const owner = await get_item_api.json()
    const data = owner.data
    return { owner: data.creator.id, bucks: data.bucks, bits: data.bits, offsale: data.offsale }
  } catch (err) {
    console.log(err)
  }
}

const get_start_data = async () => {
  try {
    const home = await get_home()
    const username = await home.match(/<div class="username-holder ellipsis inline unselectable">(.+)<\/div>/)

    if (username) {
      user.username = username[1]
    } else {
      user.username = false
    }

    const brickplus_owners = await get_brickplus_owners()
    let owners = brickplus_owners.data
    let owns = false

    for (i in owners) {
      if (owners[i].user.username.toLowerCase() == user.username.toLowerCase()) {
        owns = true
      }
    }

    user.brickplus = owns
  } catch (err) {
    console.log(err)
  }
}

const purchase_item = async (id, currency, price) => {
  try {
    const xsrf_token = await get_xsrf_token()
    user.token = await xsrf_token.value.split('%')[0].concat('=')

    const shop = await get_shop_item(id)
    const product = await shop.match(/:product-id="(.*?)"/)[1]
    item.product = product

    const purchase = await fetch('https://www.brick-hill.com/shop/purchase', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-xsrf-token': user.token
      },
      body: JSON.stringify({
        product_id: item.product,
        purchase_type: currency,
        expected_price: price,
        expected_seller: item.owner
      })
    })

    if (purchase.status === 200) {
      chrome.tabs.create({ url: 'https://www.brick-hill.com/shop/' + id })
    }
  } catch (err) {
    console.log(err)

    chrome.notifications.create('purchase error ' + id, {
      type: "basic",
      title: "Purchase Error",
      message: "Your purchase was not processed",
      iconUrl: "../images/logo128.png"
    })

    chrome.tabs.create({ url: 'https://www.brick-hill.com/shop/' + id })
  }
}

const initialize = async () => {
  const settings = await chrome.storage.local.get(['settings'])

  if (!Object.keys(settings).length || Object.keys(settings.settings).length !== Object.keys(base_settings).length) {
    chrome.storage.local.set({ settings: base_settings })
  }

  setTimeout(notifier, 1000)
}

const notifier = () => {
  get_latest_shop().then(data => {
    let latest = data.data[0]
    let notify = true

    if (!Object.keys(options.original).length) {
      options.original = latest
    } else {
      if (latest.id > options.original.id) {
        options.original = latest

        chrome.storage.local.get(['settings']).then(results => {
          let settings = results.settings

          if (!latest.special && !settings.item) {
            notify = false
          }

          if (latest.special && !settings.special) {
            notify = false
          }

          return settings.quick_purchase
        }).then(quick_purchase => {
          let title = latest.special ? 'New Special' : 'New Item'
          let item_array = []
          let button_array = []

          if (latest.bucks !== 0 && latest.bits !== 0) {
            if (latest.bucks !== null) {
              item_array.push('Bucks: ' + latest.bucks.toString())
              button_array.push({ title: 'Buy With Bucks' })
            }

            if (latest.bits !== null) {
              item_array.push('Bits: ' + latest.bits.toString())
              button_array.push({ title: 'Buy With Bits' })
            }
          }

          latest.offsale ? item_array.push('Offsale') : null

          if (!item_array.length) {
            item_array.push('Free')
            button_array.push({ title: 'Buy For Free' })
          }

          if (!quick_purchase) button_array = []

          if (notify) {
            chrome.notifications.create(latest.id.toString(), {
              type: "basic",
              title: title,
              message: latest.name + '\n' + item_array.join('\n'),
              iconUrl: latest.thumbnail,
              requireInteraction: true,
              buttons: button_array
            })
          }
        })
      }
    }
  }).then(() => { setTimeout(notifier, options.time) }).catch(err => {
    console.log(err)
    setTimeout(notifier, (options.time * 10))
  })
}

// Initializing notifier
initialize()