const fs = require('fs')
const request = require('request')

const http_header_safe_json = (v) => {
  var charsToEncode = /[\u007f-\uffff]/g;
  return JSON.stringify(v).replace(charsToEncode,
    function(c) { 
      return '\\u'+('000'+c.charCodeAt(0).toString(16)).slice(-4);
    }
  );
}

const appendToDropbox = (url, headers, data) => {
  return new Promise(resolve => {
    request.post(url, {
      headers: headers,
      body: data
    }, (error, response, body) => {
      if(error) {
        console.log(err)
      }
      resolve(body)
    })
  })
}

const appendHeaders = (token, id, offset) => ({
  Authorization: `Bearer ${token}`, 
  'Content-Type': 'application/octet-stream', 
  'Dropbox-API-Arg': http_header_safe_json({
    cursor: {
      session_id: id, 
      offset: offset
    }
  })
})

const finishHeaders = (token, id, offset, fileName) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/octet-stream', 
  'Dropbox-API-Arg': http_header_safe_json({
    cursor: {
      session_id: id, 
      offset: offset
    },
    commit: {
      path: `/${fileName}`,
      mode: 'add',
      'autorename': true,
      'mute': false
    }
  })
})

async function chunking(token, id, fileName, data) {  
  const appendURL = 'https://content.dropboxapi.com/2/files/upload_session/append_v2'
  const finishURL = 'https://content.dropboxapi.com/2/files/upload_session/finish'
  let chunk = 0
  let offset = 0
  let streamSize = 1 * 1024 * 1024
  let chunkSize = Math.ceil(data.length / streamSize)

  while(chunk < chunkSize) {
    let offset = chunk * streamSize
    chunk++
    let headers = chunk < chunkSize ? appendHeaders(token, id, offset) : finishHeaders(token, id, offset, fileName)
    let url = chunk < chunkSize ? appendURL : finishURL
    await appendToDropbox(url, headers, data.slice(offset, offset + streamSize))
  }
}

const uploadToDropbox = (token, fileName, filePath) => {
  return new Promise(resolve => {  
    fs.readFile(filePath, (err, data) => {
      console.log('reading file', filePath)
      request.post('https://content.dropboxapi.com/2/files/upload_session/start', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }
      }, (error, response, body) => {
        if(error) {
          resolve(error)
        }
        let { session_id } = JSON.parse(body)
        resolve(chunking(token, session_id, fileName, data).then(console.log('done chunking')))
      })
    })
  })
}

export { uploadToDropbox }