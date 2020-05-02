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
var db = admin.database();
//var ref = db.ref("/Customers/t60nZazByXZczXt1rBat0whcVGJ3/notificationFirebaseToken");
var ref = db.ref("barberWaitingQueues");


return ref.once("value", function(snapshot) {

    var a = snapshot.numChildren();

     snapshot.forEach((shop) => {
             console.log(today);
             console.log("shop key :"+shop.key);
             console.log("shop key Ends with :"+shop.key.endsWith(today));
             if (shop.key.endsWith(today) ) {
                 console.log("its today key :"+shop.key);
                 shop.forEach((barber) => {
                     console.log("barber key :"+barber.key);
                     barber.forEach((customer) => {
                         console.log("customer key :"+customer.key);
                         var customerStatus = customer.child("status").val();
                         console.log("customer status :"+customerStatus);
                         if(customerStatus !== null && customerStatus === "QUEUE") {
                           var expectedWaitingTime = customer.child("expectedWaitingTime").val();
                           console.log("customer waiting time :"+expectedWaitingTime);
                            db.ref("Customers/"+customer.key).once("value", function(customerSnapshot) {
                                console.log("customer in customer DB :"+customerSnapshot.key);
                                if (customerSnapshot.child("notificationFirebaseToken").exists()) {
                                    var registrationToken = customerSnapshot.child("notificationFirebaseToken").val();
                                    console.log("customer token :"+registrationToken);
                                    if (registrationToken !== null && registrationToken !== '') {
                                            var message = {
                                            data: {
                                                "waitingTime": String(expectedWaitingTime)
                                            },
                                                token: registrationToken
                                            };

                                            admin.messaging().send(message)
                                            .then((response) => {
                                                console.log('Successfully sent message for customer - '+customerSnapshot.key, response);
                                                return true;
                                            }).catch((error) => {
                                                console.log('Error sending message for customer - '+customerSnapshot.key, error);
                                            });
                                        }
                                }

                            });
                         }
                     });
                 });
             } else {
                //Old queues+
                //Archive them
                console.log("its not today key :"+shop.key);
                db.ref("archivedQueues").child(shop.key).set(shop.toJSON())
                .then(function() {
                   console.log('Shop key archived successfully - '+shop.key);
                   db.ref("barberWaitingQueues").child(shop.key).remove();
                   return true;
                 })
                 .catch(function(error) {
                   console.log('Shop Archive failed - '+shop.key);
                 });

             }

         });
});

/*return ref.once("value", function(snapshot) {

    var a = snapshot.numChildren();
    console.log("Number of records : "+a);

    var registrationToken = snapshot.val();
    console.log("registrationToken: "+registrationToken);
    if (registrationToken !== null && registrationToken !== '') {

        var message = {
        data: {
        title: 'Title From Cloud',
        content: 'Content From Cloud'
        },
        token: registrationToken
        };

        admin.messaging().send(message)
        .then((response) => {
            console.log('Successfully sent message:', response);
            return true;
        }).catch((error) => {
            console.log('Error sending message:', error);
        });
    }
});*/


//return ref.once("value", function(snapshot) {
//
//    var a = snapshot.numChildren();
//    console.log("Number of records : "+a);
//    console.log(snapshot.val());
//});





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
