chrome.runtime.onInstalled.addListener(() => {
  console.log('Get Movie Ratings extension installed.')
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_RATINGS') {
    sendResponse({ ratings: {} })
  }
  return true
})
