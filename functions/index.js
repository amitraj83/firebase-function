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

//var serviceAccount = require("./qcutbiz-c375e639909a.json");
//
//admin.initializeApp({
//  credential: admin.credential.cert(serviceAccount),
//  databaseURL: "https://qcut-test.firebaseio.com"
//});

admin.initializeApp();

//exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
  console.log('This will be run every 1 minutes!');

//    var rootRef = admin.database().ref();
//    console.log(rootRef);
  

exports.shopDetailsUpdate = functions.database.ref("/shopDetails/-M5hCL0DhhMJ9TM8jB0j")
                            .onUpdate((change, context) => {
            console.log('This is the update');
             var before = change.before  // DataSnapshot before the change
             var after = change.after  // DataSnapshot after the change
             console.log(change.before.child("key").val())
             return "Update was called";
           });
/*exports.shopDetailsCreate = functions.database.ref("/shopDetails/-M5hCL0DhhMJ9TM8jB0j")
                            .onCreate((snapshot, context) => {
            console.log('This is the Create');
             console.log(snapshot.exists())
             return "Create was called";
           });*/



/*exports.shopDetailsWrite = functions.database.ref("/shopDetails/-M5hCL0DhhMJ9TM8jB0j")
                           .onWrite((snapshot, context) => {
           console.log('This is the Write');
            console.log(snapshot.exists())
            return "write was called";
          });*/
/*


		snapshot.forEach(function(childSnapshot) {
		  var shopKey = childSnapshot.key;
			const timeStamp = admin.database.ServerValue.TIMESTAMP;
			const currentTime = new Date(timeStamp);
			const currentDate = currentTime.getDate().toString;
			const currentMonth = currentTime.getMonth().toString;
			const currentYear = currentTime.getFullYear().toString;
			const dateFormat = currentDate + " " + currentMonth + " " + currentYear;
			console.log(dateFormat);

			var shopQueueKey = shopKey + "_" + dateFormat;
            console.log(shopQueueKey);

            var queueList = functions.database.ref().ref("barberWaitingQueues/"+shopQueueKey);
            queueList.once("value").then((queueSnapshot) => {

                queueSnapshot.forEach(function(barberSnapshot) {
                    console.log(barberSnapshot.key);
                });

                return null;
            }).catch(error => { throw error;});



	  });

	  return null;
	}).catch(error => { throw error;});
	  */
//    return "";
//});

