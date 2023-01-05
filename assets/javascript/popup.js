$(document).ready(() => {
  let global_settings = {}

  chrome.storage.local.get('settings').then(result => {
    let settings = result.settings
    global_settings = settings

    $('#opt_item').prop('checked', settings.item)
    $('#opt_special').prop('checked', settings.special)
  })

  $('#opt_item').change(() => {
    let new_settings = { ...global_settings, item: $('#opt_item').is(':checked') }
    chrome.storage.local.set({ settings: new_settings }).then(() => { global_settings = new_settings })
  })

  $('#opt_special').change(() => {
    let new_settings = { ...global_settings, special: $('#opt_special').is(':checked') }
    chrome.storage.local.set({ settings: new_settings }).then(() => { global_settings = new_settings })
  })
})