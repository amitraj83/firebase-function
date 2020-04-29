var functions = require('firebase-functions');

var admin = require("firebase-admin");
var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");
var config = {
    apiKey: "AIzaSyAuj4-6MiqS04q9bb3vBjzzQs__szyneoU",
    authDomain: "qcut-test.firebaseapp.com",
    databaseURL: "https://qcut-test.firebaseio.com",
    storageBucket: "qcut-test.appspot.com",
    projectId:"qcut-test"
};

firebase.initializeApp(config);

admin.initializeApp();
var moment = require('moment');

exports.shopDetails = function() {
    return new Promise( (resolve, reject) => {
            console.log('Inside Promise');
        admin.database.ref('/shopDetails')
        .once('value').then((dataSnapshot) => {
          // handle read data.
          console.log("Key : "+dataSnapshot.key);
          return dataSnapshot;
        }).catch(() => { console.log('No'); return false;});
    }).then(() => { console.log('Success2'); return true;}).catch(() => { console.log('Failed2'); return false;});
};


exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
  console.log('This will be run every 1 minutes!');
  var date = new Date();
  var today = moment(date).format('DDMMYYYY');
console.log(today);


var shopDetailsData = function() {
    return new Promise( (resolve, reject) => {
                console.log("Inside Promise");
        admin.database.ref('/shopDetails')
        .once('value').then((dataSnapshot) => {
          // handle read data.
          console.log("Key : "+dataSnapshot.key);
          return dataSnapshot;
        }).catch(() => { console.log('No'); return false;});
    }).then(() => { console.log('Success'); return true;}).catch(() => { console.log('Failed-1'); return false;});
};
shopDetailsData();
shopDetails();
return true;
});





//exports.waitingQueueUpdate =

/*exports.waitingQueueUpdate = functions.database.ref("/barberWaitingQueues")
                            .onUpdate((change, context) => {
    console.log('This is the update' - context.params.pushId);
     var before = change.before;  // DataSnapshot before the change
     var shopKey = change.after ; // DataSnapshot after the change
     console.log(shopKey.key);
        shopKey.key.ref.
     const authVar = context.auth; // Auth information for the user.
     console.log("resource "+resource.type);

//             shopKey.forEach((barber) => {
//                console.log(barber.key);
//                barber.forEach((customer) => {
//                    console.log(customer.key);
//                });
//             });

     return "Update was called";
});*/


