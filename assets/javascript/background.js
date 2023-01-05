const options = {
  time: 10000,
  original: { id: 101010 }
}

//v1 API for the boy jefemy
const url = {
  shop: ' https://api.brick-hill.com/v1/shop/list?limit=20&cursor=&search=&verified_designers_only=false&special_only=false&event_only=false&show_unavailable=true&sort=newest',
  test: 'https://api.brick-hill.com/v1/shop/list?limit=20&cursor=&search=&types[]=pants&types[]=shirt&types[]=tshirt&verified_designers_only=false&special_only=false&event_only=false&show_unavailable=true&sort=newest'
}

chrome.notifications.onButtonClicked.addListener((id, index) => {
  if (id) {
    if (index === 0) {
      chrome.tabs.create({ url: 'https://www.brick-hill.com/shop/' + id })
    } else if (index === 1) {
      chrome.notifications.clear(id)
    }
  }
})

const get_latest_shop = async () => {
  const response = await fetch(url.test)
  const shop_data = await response.json()
  return shop_data
}

const initialize = () => {
  chrome.storage.local.get(['settings']).then(result => {
    if (!Object.keys(result).length) {
      chrome.storage.local.set({ settings: { item: true, special: true } })
    }
  }).then(() => {
    setTimeout(notifier, 1000)
  })
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
          } else if (latest.special && !settings.special) {
            notify = false
          }
        }).then(() => {
          let title = latest.special ? 'New Special' : 'New Item'
          let item_array = []

          latest.bucks !== null ? item_array.push({ title: 'Bucks', message: latest.bucks.toString() }) : null
          latest.bits !== null ? item_array.push({ title: 'Bits', message: latest.bits.toString() }) : null

          latest.offsale ? item_array.push({ title: '', message: 'Offsale' }) : null
          item_array.length ? null : item_array.push({ title: '', message: 'Free' })

          if (notify) {
            chrome.notifications.create(latest.id.toString(), {
              type: "list",
              items: item_array,
              title: title,
              message: latest.name,
              iconUrl: latest.thumbnail,
              requireInteraction: true,
              buttons: [{ title: 'View Item' }, { title: 'Close' }]
            })
          }
        })
      }
    }

    setTimeout(notifier, options.time)
  })
}

// Initializing notifier
initialize()