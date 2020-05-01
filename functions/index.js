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




var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://qcut-test.firebaseio.com"
});
firebase.initializeApp(config);


var moment = require('moment');

exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {





var date = new Date();
const today = moment(date).utcOffset('+0100').format('DDMMYYYY');
console.log("Today: "+today);
var db = admin.database();
var ref = db.ref("/shopDetails");

return ref.once("value", function(snapshot) {

    var a = snapshot.numChildren();
    console.log("Number of records : "+a);
    console.log(snapshot.val());
});





});
/*

exports.waitingQueueUpdate = functions.database.ref("/barberWaitingQueues")
                            .onUpdate((change, context) => {
    console.log('This is the update' - context.params.pushId);
     var before = change.before;  // DataSnapshot before the change
     var shopKey = change.after ; // DataSnapshot after the change
     console.log("snapshot key :"+shopKey.key);
    shopKey.forEach((shop) => {
        console.log(today);
        console.log("shop key :"+shop.key);
        console.log("shop key Ends with :"+shop.key.endsWith(today));
        if (shop.key.endsWith(today) ) {
            console.log("its today key :"+shop.key);
            shop.forEach((barber) => {
                console.log("barber key :"+barber.key);
                barber.forEach((customer) => {
                    console.log("customer key :"+customer.key);
                    shopKey.ref.parent.child("customerView/"+customer.key).set(customer.toJSON());
                    shopKey.ref.parent.child("customerView/"+customer.key).update({
                        "shop":shop.key.replace("_"+today, ""),
                        "barber":barber.key,
                        "shopWithDate":shopKey,

                    });
                });
            });
        }
    });
     return "Update was called";
});

exports.waitingQueueWrite = functions.database.ref("/barberWaitingQueues")
                            .onWrite((change, context) => {
    console.log('This is the Write' - context.params.pushId);
     var before = change.before;  // DataSnapshot before the change
     var shopKey = change.after ; // DataSnapshot after the change
     console.log("snapshot key :"+shopKey.key);
    shopKey.forEach((shop) => {
        console.log(today);
        console.log("shop key :"+shop.key);
        console.log("shop key Ends with :"+shop.key.endsWith(today));
        if (shop.key.endsWith(today) ) {
            console.log("its today key :"+shop.key);
            shop.forEach((barber) => {
                console.log("barber key :"+barber.key);
                barber.forEach((customer) => {
                    console.log("customer key :"+customer.key);
                    shopKey.ref.parent.child("customerView/"+customer.key).set(customer.toJSON());
                    shopKey.ref.parent.child("customerView/"+customer.key).update({
                        "shop":shop.key.replace("_"+today, ""),
                        "barber":barber.key,
                        "shopWithDate":shopKey,

                    });
                });
            });
        }
    });
     return "Write was called";
});
*/
