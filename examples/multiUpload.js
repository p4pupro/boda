function uploadFile() {
      
    const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
    var dbx = new Dropbox.Dropbox({ accessToken: '2Mh0yZtJjJ8AAAAAAAEJKnb5j51ZedTwlGSUrCLQDIAa-5dFO4wqufRR5mtCGjL7' });
    var fileInput = document.getElementById('file-upload');
    var fileList  = [];

     if ( fileInput.files.length >= 0 ) {
        for ( var i = 0; i < fileInput.files.length; i++ ) {
            fileList.push( fileInput.files[i] );
        }  
     }


    for (var j = 0; j < fileList.length; j++) {

        if ( fileList[j].size < UPLOAD_FILE_SIZE_LIMIT ) { // File is smaller than 150 Mb - use filesUpload API
            dbx.filesUpload({path: '/Boda2018/' + fileList[j].name, contents: fileList[j]})
                .then(function(response) {
                    var results = document.getElementById('results');
                    results.appendChild(document.createTextNode('Fotos subidas!'));
                    console.log(response);
                })
                .catch(function(error) {
                    console.error(error);
                });
        } else {
            // File is bigger than 150 Mb - use filesUploadSession* API
            const maxBlob = 8 * 1000 * 1000; // 8Mb - Dropbox JavaScript API suggested max file / chunk size

            var workItems = [];     
    
            var offset = 0;

            while (offset < fileList[j].size) {
                var chunkSize = Math.min(maxBlob, fileList[j].size - offset);
                workItems.push(fileList[j].slice(offset, offset + chunkSize));
                offset += chunkSize;
            }

            const task = workItems.reduce((acc, blob, idx, items) => {
                if (idx == 0) {
                  // Starting multipart upload of file
                  return acc.then(function() {
                    return dbx.filesUploadSessionStart({ close: false, contents: blob})
                              .then(response => response.session_id)
                  });          
                } else if (idx < items.length-1) {  
                  // Append part to the upload session
                  return acc.then(function(sessionId) {
                   var cursor = { session_id: sessionId, offset: idx * maxBlob };
                   return dbx.filesUploadSessionAppendV2({ cursor: cursor, close: false, contents: blob }).then(() => sessionId); 
                  });
                } else {
                  // Last chunk of data, close session
                  return acc.then(function(sessionId) {
                    var cursor = { session_id: sessionId, offset: fileList[j].size - blob.size };
                    var commit = { path: '/Boda2018/' + fileList[j].name, mode: 'add', autorename: true, mute: false };              
                    return dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: blob });           
                  });
                }          
              }, Promise.resolve());
              
              task.then(function(result) {
                var results = document.getElementById('results');
                results.appendChild(document.createTextNode('File uploaded!'));
              }).catch(function(error) {
                console.error(error);
              });
              
            }
               
    }
    return false; 
    
  }