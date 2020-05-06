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

var db = admin.database();
var moment = require('moment');
var date = new Date();

const today = moment(date).utcOffset('+0100').format('DDMMYYYY');

/*
exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {

var date = new Date();
const today = moment(date).utcOffset('+0100').format('DDMMYYYY');

//var ref = db.ref("/Customers/t60nZazByXZczXt1rBat0whcVGJ3/notificationFirebaseToken");
var ref = db.ref("barberWaitingQueues");


return ref.once("value", function(snapshot) {

    var a = snapshot.numChildren();

     snapshot.forEach((shop) => {
             if (shop.key.endsWith(today) ) {
                 shop.forEach((barber) => {
                     barber.forEach((customer) => {
                         var customerStatus = customer.child("status").val();
                         if(customerStatus !== null && customerStatus === "QUEUE") {
                           var expectedWaitingTime = customer.child("expectedWaitingTime").val();
                            db.ref("Customers/"+customer.key+"/notificationFirebaseTokens").once("value", function(customerSnapshot) {
                                if (customerSnapshot.exists()) {
                                    customerSnapshot.forEach((deviceid) => {
                                        var registrationToken = deviceid.val();
                                        console.log(deviceid.key + " -- "+registrationToken);
                                        if (registrationToken !== null && registrationToken !== '') {
                                            var message = {
                                            android : {
                                                priority : "high"
                                            },
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
                                    });
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

});
*/

function BarberQueue(key, shopKey, status, avgTimeToCut) {
    this.barberKey = key;
    this.shopKey = shopKey;
    this.barberStatus = status;
    this.avgTimeToCut = avgTimeToCut;
    this.customers = new Array();
}
BarberQueue.prototype.getStatus = function() {
  return this.barberStatus;
};
BarberQueue.prototype.getKey = function() {
  return this.barberKey;
};
BarberQueue.prototype.getShopKey = function() {
  return this.shopKey;
};
BarberQueue.prototype.getAvgTimeToCut = function() {
  return this.avgTimeToCut;
};
BarberQueue.prototype.getCustomers = function() {
  return this.customers;
};

BarberQueue.prototype.addCustomer = function(customer) {
  this.customers.push(customer);
};

function BarberSorted(key, timeToGetAvailable, avgServiceTime) {
this.key = key;
this.timeToGetAvailable = timeToGetAvailable;
this.avgServiceTime = avgServiceTime;
}

BarberSorted.prototype.getKey = function() {
  return this.key;
};
BarberSorted.prototype.setTimeToGetAvaialble = function(timeToGetAvailable) {
  this.timeToGetAvailable = timeToGetAvailable;
};

BarberSorted.prototype.getTimeToGetAvaialble = function() {
  return this.timeToGetAvailable ;
};
BarberSorted.prototype.getAvgServiceTime = function() {
  return this.avgServiceTime ;
};


function CompareForBarberSorted(BarberSorted1, BarberSorted2){
    if (BarberSorted1.timeToGetAvailable > BarberSorted2.timeToGetAvailable)
        return 1;
    if (BarberSorted1.timeToGetAvailable === BarberSorted2.timeToGetAvailable)
        return 0;
    else
        return -1;
}

function getCustomerTime (customer) {
    var customerArrivalTime = customer.arrivalTime;

    var customerDragTime = customer.dragAdjustedTime;
    
    if(Object.exists(customerArrivalTime)) {
        if(Object.exists(customerDragTime)) {
            if(customerDragTime === 0) {
                return customerArrivalTime;
            } else {
                return customerDragTime;
            }
        } else {
            return customerArrivalTime;
        }
    } else {
        return 0;
    }
}
function CustomerComparator(customer1, customer2) {
    var c1Time = getCustomerTime(customer1);
    var c2Time = getCustomerTime(customer2);
    
    if(c1Time > c2Time) {
        return 1;
    } else if (c1Time === c2Time) {
        return 0;
    } else {
        return -1;
    }
}

function getCustomerTimeSNAP (customer) {
    var customerArrivalTime = customer.child("arrivalTime").val();

    var customerDragTime = customer.child("dragAdjustedTime").val();

    if(Object.exists(customerArrivalTime)) {
        if(Object.exists(customerDragTime)) {
            if(customerDragTime === 0) {
                return customerArrivalTime;
            } else {
                return customerDragTime;
            }
        } else {
            return customerArrivalTime;
        }
    } else {
        return 0;
    }
}

function INCustomerComparator(customer1, customer2) {
     var c1Time = getCustomerTimeSNAP(customer1);
     var c2Time = getCustomerTimeSNAP(customer2);

     if(c1Time > c2Time) {
         return 1;
     } else if (c1Time === c2Time) {
         return 0;
     } else {
         return -1;
     }
}


Object.exists = function(obj) {
    return typeof obj !== "undefined" && obj !== null;
}


function barberWithStatus(aShop) {
    console.log("["+aShop.key+"] "+"in barberwithstatus: aShop - "+aShop);
//    var aShop = promiseReceived[0];
    return db.ref("barbers/"+aShop.key).once("value").then( (snapshot) => {
                                    var statuses = {};
                                    console.log("["+aShop.key+"] "+"in barberwithstatus: aShop - "+snapshot.key);
                                     snapshot.forEach((barber) => {
                                        console.log("["+aShop.key+"] "+"in barberwithstatus: barber - "+barber.key);
                                        console.log("["+aShop.key+"] "+"in barberwithstatus: barber queue status - "+barber.child("queueStatus").val());
                                        statuses[barber.key] = barber.child("queueStatus").val();
                                     });
                                     console.log("["+aShop.key+"] "+"in barberwithstatus: statuses - "+JSON.stringify(statuses));
                                     return (statuses);
                                 })
                                 .catch((error) => {
                                     console.log("["+aShop.key+"] "+"in barberwithstatus: error - "+error.toString());
                                 });


//    return Promise.all(statusesPromise);
}

function listOfBarberQueues(aShop, barberStatuses) {
//    var aShop = promiseReceived[0];
    console.log("["+aShop.key+"] "+"waiting queue ref : "+aShop.key+"_"+today);
    return db.ref("barberWaitingQueues/"+aShop.key+"_"+today).once("value")
                .then( (snapshot) => {
                var barberQueues = new Array();
                 snapshot.forEach((barber) => {
                    console.log("["+aShop.key+"] "+"listOfBarberQueues => barber key : "+barber.key);
                     var avgTimeToCut = aShop.child("avgTimeToCut").val();
                     console.log("["+aShop.key+"] "+"listOfBarberQueues => avgTimeToCut : "+avgTimeToCut);
                     var status = barberStatuses[barber.key];
                     console.log("["+aShop.key+"] "+"listOfBarberQueues => status : "+status);
                     var barberQueue = new BarberQueue(barber.key, aShop.key, status, avgTimeToCut);
                     barberQueues.push(barberQueue);
                     barber.forEach((customer) => {
                            barberQueue.addCustomer(customer);

                     })
                 });
//                console.log("["+aShop.key+"] "+"in ListofBarberQueues - return -> "+JSON.stringify(barberQueues));
                return (barberQueues);
            })
            .catch((error) => {
                console.log("["+aShop.key+"] "+"in ListofBarberQueues - error -> "+error);
            });


//    return Promise.all([promiseReceived]);
}

function barberSortedList(aShop, barberQueues) {
//    var aShop = promiseReceived[0];
    //Filter out barbers who are stopped
    //return the list of barbers sorted by time to become avaialble
//    var barberQueues = promiseReceived[2];
//    console.log("["+aShop.key+"] "+"In Barber queues : "+JSON.stringify(barberQueues));

    var listBarberSorted = new Array();
    barberQueues.forEach(barberQueue => {
        var barberStatus = barberQueue.getStatus();
//        console.log("["+aShop.key+"] "+"In Barber queues => barberQueue: "+JSON.stringify(barberQueue));
        if (barberStatus !== "STOP") {
            //Calculate time for a barber to become available
            var remainingMinsToComplete = 0;
            var avgTimeToCut = 15;
            if(Object.exists(aShop.child("avgTimeToCut").val())) {
                avgTimeToCut = aShop.child("avgTimeToCut").val();
            }
            barberQueue.getCustomers().forEach(customer => {
                if(customer.child("status").val() === "PROGRESS") {
                    var serviceStartTime = customer.child("serviceStartTime").val();
                    var currentTimeInMiliSeconds = moment().utcOffset('+0100').valueOf();
                    var minutesPassedSinceStarted = ( ( (currentTimeInMiliSeconds - serviceStartTime) / 1000 ) / 60 );
                    
                    remainingMinsToComplete = avgTimeToCut - minutesPassedSinceStarted;
                    if (remainingMinsToComplete < 0 ) {
                        remainingMinsToComplete = 0;
                    }
                }
                
            });
            listBarberSorted.push(new BarberSorted(barberQueue.getKey(), remainingMinsToComplete, avgTimeToCut) ) ;
        }
    });
    return listBarberSorted.sort(CompareForBarberSorted);

//    return Promise.all(promiseReceived);
}

function removeAndGetAllCustomerToBeAddedLater(aShop, barberQueues, barberSortedList ) {
//All Customer in the queue should be removed and put in a set.
//    var aShop = promiseReceived[0];


    return new Promise((resolve, reject) => {
        var allQueuedCustomerSorted = new Array();
        var eachPromises = new Array();
        //    var barberQueues = promiseReceived[2];
//        console.log("[REMOVEANDSORT] barberQueues: " + JSON.stringify(barberQueues));
            barberQueues.forEach(barberQueue => {
                if (Object.exists(barberQueue)) {
                    console.log("[REMOVEANDSORT] barber key: " + barberQueue.getKey());
                    barberQueue.getCustomers().forEach(customer => {
                        if (Object.exists(customer)) {
                            console.log("[REMOVEANDSORT] -- customer key" + customer.key);
                            console.log("[REMOVEANDSORT] -- customer key status " + customer.child("status").val());
                            if (customer.child("status").val() === "QUEUE") {
                                console.log("[REMOVEANDSORT] --- In Queue customer key" + customer.key);
                                console.log("[REMOVEANDSORT] --- barberQueue.getShopKey " + barberQueue.getShopKey());
                                var custInJSON = customer.toJSON();
                                allQueuedCustomerSorted.push(custInJSON);
                                db.ref("barberWaitingQueues").child(barberQueue.getShopKey()+"_"+today)
                                                                            .child(barberQueue.getKey()).child(customer.key)
                                                                            .ref.remove();
                                /*eachPromises.push(
                                    new Promise((resolve, reject) => {
                                    return db.ref("barberWaitingQueues").child(barberQueue.getShopKey()+"_"+today)
                                            .child(barberQueue.getKey()).child(customer.key)
                                            .ref.remove();

//                                            .ref.remove(() => {
//                                                console.log("Remove succeeded for "+customer.key);
//                                                allQueuedCustomerSorted.push(custInJSON);
//                                                console.log("[REMOVEANDSORT] --- sorted allQueuedCustomerSorted " + JSON.stringify(allQueuedCustomerSorted));
//                                                resolve(allQueuedCustomerSorted);
//                                            }) ;
                                    })
                                )*/

                            }
                        }
                    });
                }
                resolve(allQueuedCustomerSorted);
            });
        return Promise.all([allQueuedCustomerSorted]);
    })
//    .then((tempSortedCustomer) => {
//        console.log("In THEN Clause tempSortedCustomer : "+JSON.stringify(tempSortedCustomer));
//        var allQueuedCustomerSorted = tempSortedCustomer[1];
//        console.log("In THEN Clause : "+JSON.stringify(allQueuedCustomerSorted));
//        var finalSortedArray =  allQueuedCustomerSorted.sort(CustomerComparator);
//        return Promise.all([finalSortedArray]);
//    })
    .catch((error) => {
        console.log("Error while removeAndGetAllCustomerToBeAddedLater: "+error)
    });

}


//    return Promise.all(promiseReceived);


function assignCustomersToBarbers(aShop, barberQueues, sortedListOfBarbers, sortedListOfCustomer) {

    var sequence = Promise.resolve();








        var placeInQueue = 1;
        //var allPromises = array;
        sortedListOfCustomer.forEach(customer => {

            sequence = sequence
            .then(() => {

                var barberKey = "";
                if(Object.exists(customer) && Object.exists(customer.anyBarber) && customer.anyBarber === true) {
                console.log("["+aShop.key+"] "+"To select sortedListOfBarbers - "+JSON.stringify(sortedListOfBarbers));
                    barberKey = sortedListOfBarbers[0].getKey();
                    console.log("["+aShop.key+"] "+"in assignCustomersToBarbers => any barber key "+JSON.stringify(barberKey));
                } else {
                    barberKey = customer.preferredBarberKey;
                    console.log("["+aShop.key+"] "+"in assignCustomersToBarbers => preferred barber key "+JSON.stringify(barberKey));
                }
                if (Object.exists(barberKey) && barberKey !== "") {
                console.log("["+aShop.key+"] "+"in assignCustomersToBarbers => barber key "+JSON.stringify(barberKey));
                console.log("["+aShop.key+"] "+"in assignCustomersToBarbers => customer  "+JSON.stringify(customer));

                     return db.ref("barberWaitingQueues").child(aShop.key+"_"+today).child(barberKey)
                     .child(customer.key)
                    .set(customer)
                    .then(() => {
                        console.log("["+aShop.key+"] "+"1 - sortedListOfBarbers : "+JSON.stringify(sortedListOfBarbers));
                        for(var i = 0 ; i < sortedListOfBarbers.length ; i++) {
                            console.log("["+aShop.key+"] "+"1 - sortedListOfBarbers : "+JSON.stringify(sortedListOfBarbers));
                            var sortedBarber = sortedListOfBarbers[i];
                            if(sortedBarber.getKey() === barberKey) {
                                sortedBarber.setTimeToGetAvaialble(sortedBarber.getTimeToGetAvaialble() + sortedBarber.getAvgServiceTime());
                                console.log("["+aShop.key+"] "+"1 - sortedListOfBarbers : "+JSON.stringify(sortedListOfBarbers));
                            }
                        }
                        return sortedListOfBarbers.sort(CompareForBarberSorted);

                     })
                     .then((sortedListOfBarbers) => {
                        console.log("["+aShop.key+"] "+"Next - sortedListOfBarbers : "+JSON.stringify(sortedListOfBarbers));
                        return db.ref("barberWaitingQueues").child(aShop.key+"_"+today).child(barberKey)
                                     .child(customer.key)
                                     .child("timeAdded").set(placeInQueue++);
                     })
                     .catch((error) => {
                       console.log("["+aShop.key+"] "+"Reallocation of customer is failed. Trying again - "+customer.key);
                       throw error;
                     });
                }




            })
            .catch((error) => {
                throw error;
            });


        });





    return sequence;
}

function updateWaitingTimes(aShopKey) {
    console.log("Updating times: aShopKey: "+JSON.stringify(aShopKey));
    return db.ref("barberWaitingQueues/"+aShopKey+"_"+today).once("value")
    .then((shop) => {
        var avgTimeToCut = db.ref("shopDetails/"+aShopKey).once("value")
            .then((aShopDetail) => {
                console.log("Updating times: aShopDetail avgTimeToCut: "+JSON.stringify(aShopDetail));
                console.log("Updating times: aShopDetail avgTimeToCut: "+JSON.stringify(aShopDetail.child("avgTimeToCut").val()));
                return aShopDetail.child("avgTimeToCut").val();
            })
            .catch((error) => {
                  throw error;
              });
//                return db.ref("shopDetails/"+aShopKey).once("value").child("avgTimeToCut").val();
//            })
        return Promise.all([shop, avgTimeToCut]);

    })
    .then( (promiseReceived) => {
        var shop = promiseReceived[0];
        var avgTimeToCut = promiseReceived[1];
        console.log("Updating times: shop: "+JSON.stringify(shop));
        console.log("Updating times: avgTimeToCut: "+JSON.stringify(avgTimeToCut));
//        for(var i = 0; i < shop.length; i++) {
//            var barber = shop[i];

        shop.forEach((barber) => {
            console.log("Updating times: barber: "+JSON.stringify(barber));

            //here we need to update the timings
            var inQueueCustomers = new Array();
            var inProgressCustomer;
            var inProgressCustomerServiceStartTime;


            barber.forEach((customer) => {
                if(!Object.exists(customer)) {
                    return;
                }
                console.log("Updating times:  customer: "+JSON.stringify( customer));
                var custStatus = customer.child("status").val();
                if(!Object.exists(custStatus)) {
                    return;
                }


                console.log("Updating times:  custStatus: "+JSON.stringify( custStatus));
                 if (Object.exists(custStatus) && custStatus === "PROGRESS") {
                     inProgressCustomer = customer;
                     console.log("Updating times:  inProgressCustomer: "+JSON.stringify( inProgressCustomer));

                     inProgressCustomerServiceStartTime = customer.child("serviceStartTime").val();
                      console.log("Updating times:  inProgressCustomerServiceStartTime: "+JSON.stringify( inProgressCustomerServiceStartTime));

                 } else if (Object.exists(custStatus) && custStatus === "QUEUE") {
                      inQueueCustomers.push(customer);
                    console.log("Updating times:  inProgressCustomerServiceStartTime: "+JSON.stringify( inQueueCustomers));

                 }
            });
            //Here is the main logic
            if(Object.exists(inQueueCustomers)) {
                inQueueCustomers = inQueueCustomers.sort(INCustomerComparator);
                console.log("Updating times:  after sort inQueueCustomers : "+JSON.stringify( inQueueCustomers));

            }

            var prevCustomerTime = 0;
            console.log("Updating times:  inQueueCustomers.length : "+JSON.stringify( inQueueCustomers.length));

            for(var i = 0 ; i < inQueueCustomers.length ; i++) {
                var customer = inQueueCustomers[i];
                var newTimeToWait;

                if ( i === 0 ) {
                    //first customer
                    console.log("Updating times:  i === 0  customer : "+JSON.stringify( customer));

                    if(Object.exists(inProgressCustomer) && Object.exists(inProgressCustomerServiceStartTime)) {
                        //first customer in progress
                        var currentTimeInMiliSeconds = moment().utcOffset('+0100').valueOf();
                        var timeToWait = avgTimeToCut - ((currentTimeInMiliSeconds - inProgressCustomerServiceStartTime)/60000);
                        timeToWait = timeToWait.toFixed(0);
                        newTimeToWait = Math.max(0, timeToWait);
                    } else {
                        //first customer not in progress
                        newTimeToWait = 0;
                    }
                    prevCustomerTime = newTimeToWait;
                    console.log("Updating times: newTimeToWait : "+JSON.stringify( newTimeToWait));
                } else {
                    //Not the first customer
                    newTimeToWait = prevCustomerTime + avgTimeToCut;
                    prevCustomerTime = newTimeToWait;
                    console.log("Updating times: prevCustomerTime : "+JSON.stringify( prevCustomerTime));
                }
                console.log("Updating times: newTimeToWait : "+JSON.stringify( newTimeToWait));

                if(Object.exists(newTimeToWait)) {
                    console.log("Updating times: before expectedWaitingTime customer: "+JSON.stringify( customer));
                    customer.ref.child("expectedWaitingTime").set(newTimeToWait);
                    console.log("Updating times: before expectedWaitingTime customer: "+JSON.stringify( customer));

                }
            }

         });
         return true;
    }).catch((error) => {
        console.log(error);
    });




return true;
}


//exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
//Following should run for each shop

//return
db.ref("shopDetails").once("value", (snapshot) => {
    snapshot.forEach((aShop) => {
//    if(aShop.key !== "-M5hCL0DhhMJ9TM8jB0j") {
//        return false;
//    }
    try {
        var sShopAvgTimeToCut = aShop.child("avgTimeToCut").val();
        //transaction starts here on a shop
        db.ref("barberWaitingQueues/"+aShop.key+"_"+today)
        .once("value")
        .then(function(dataSnapshot) {
            console.log("Children Count: "+dataSnapshot.hasChildren());
            if (dataSnapshot.hasChildren() === true) {

        var shopQueuesReference = db.ref("barberWaitingQueues/"+aShop.key+"_"+today);
        console.log("["+aShop.key+"] "+"Starting transaction for shop : "+aShop.key +" Today : "+today);
        shopQueuesReference.transaction((shopQueuesJSON) => {
            console.log("["+aShop.key+"] "+"first thing in the transaction - Shop Key : "+aShop.key)
            if (shopQueuesJSON !== null) {
                console.log("["+aShop.key+"] "+"json returned null");
                return ; //abort transaction
            } else {
            //Performe re-allocation
            console.log("["+aShop.key+"] "+"Starting re-allocation of customers" + aShop.key);
//            return new Promise(function (resolve, reject, aShop) {
//              var promiseReceived = new Array();
//              promiseReceived[0] = aShop;
//              console.log("Returning first promise: "+aShop.key);
//              resolve (promiseReceived);
//            })
            return Promise.all([aShop]).then( (promiseReceived) => {
            var promiseShop = promiseReceived[0];
            console.log("["+promiseShop.key+"] "+"executing barberWithStatus "+promiseReceived[0]);
            console.log("["+promiseShop.key+"] "+"executing barberWithStatus shop key: "+promiseReceived[0].key);
            var barberStatusespromise = barberWithStatus(promiseShop);
            //console.log("["+promiseShop.key+"] "+" barberStatusespromise "+JSON.stringify(barberStatusespromise));
            return Promise.all([promiseReceived[0], barberStatusespromise]);
            })
            .then( (promiseReceived) => {
            //real all data
            var promiseShop = promiseReceived[0];
            var barberStatuses = promiseReceived[1];
            console.log("["+promiseShop.key+"] "+"executing listOfBarberQueues for shop - "+promiseReceived[0].key);
            console.log("["+promiseShop.key+"] "+"barberStatuses - "+JSON.stringify(barberStatuses));
            return Promise.all([promiseShop, listOfBarberQueues(promiseShop, barberStatuses)]);
            })
            .then( (promiseReceived) => {
                //sortedListOfBarbersForReAllocation
                var promiseShop = promiseReceived[0];
                var barberQueues = promiseReceived[1];
                console.log("["+promiseShop.key+"] "+"executing barberSortedList ");
//                console.log("["+promiseShop.key+"] "+"calling Barber queues : "+JSON.stringify(barberQueues));
                if (Object.exists(barberQueues)) {
                   return Promise.all([promiseShop, barberQueues,  barberSortedList(promiseShop, barberQueues)]);
                } else {
                     throw new Error("["+promiseShop.key+"] "+"No barber queue exists for shop : "+promiseShop);
                }
            })
            .then( (promiseReceived) => {
            //removeAndGetAllCustomerToBeAddedLater
            var promiseShop = promiseReceived[0];
            var barberQueues = promiseReceived[1];
            var barberSortedList = promiseReceived[2];
//            console.log("["+promiseShop.key+"] "+"calling removeAndGetAllCustomerToBeAddedLater => barberQueues"+JSON.stringify(barberQueues));
//            console.log("["+promiseShop.key+"] "+"calling removeAndGetAllCustomerToBeAddedLater => barberSortedList"+JSON.stringify(barberSortedList));
            var tempPromise = removeAndGetAllCustomerToBeAddedLater(promiseShop, barberQueues, barberSortedList);
            return Promise.all([promiseShop, barberQueues, barberSortedList, tempPromise]);
            })
            .then( (promiseReceived) => {
            var promiseShop = promiseReceived[0];
            console.log("["+promiseShop.key+"] "+"executing assignCustomersToBarbers 1 : "+JSON.stringify(promiseShop));
            var barberQueues = promiseReceived[1];
            console.log("["+promiseShop.key+"] "+"executing assignCustomersToBarbers 2 : "+JSON.stringify(barberQueues));
            var barberSortedList = promiseReceived[2];
            console.log("["+promiseShop.key+"] "+"executing assignCustomersToBarbers 3 : "+JSON.stringify(barberSortedList));
            var allQueuedCustomerSorted = promiseReceived[3];
            allQueuedCustomerSorted = allQueuedCustomerSorted.sort(CustomerComparator);
             console.log("["+promiseShop.key+"] "+"calling assignCustomersToBarbers => allQueuedCustomerSorted"+JSON.stringify(allQueuedCustomerSorted));
            //assignCustomersToBarbers
            console.log("["+promiseShop.key+"] "+"executing assignCustomersToBarbers ");
            var shopSnapshotInJSON = assignCustomersToBarbers(promiseShop, barberQueues, barberSortedList, allQueuedCustomerSorted);
            return Promise.all([promiseShop, shopSnapshotInJSON]);
            })
//            .then(() => {
//                console.log("Final Step");
//                return db.ref("barberWaitingQueues").child(aShop.key+"_"+today).toJSON();
//            })
            .then((promiseReceived) => {
                console.log("Final Shop Data: "+JSON.stringify(promiseReceived[0]));
                return updateWaitingTimes(promiseReceived[0].key);
            })
            .catch( (error) => {
                console.log("Error while transaction execution: "+error); // 'Some terrrrible error.'
            });

            //transaction should ends here
            }
        },
        (error, committed, aShop) => {
          if (error) {
            console.log('Transaction failed abnormally!', error);
          } else if (!committed) {
            console.log('We aborted the transaction.'+committed);
          } else {
            console.log('Transaction successful.');

            //updateWaitingTimes(aShop[0].key);
          }

        });

            }
         return true;
        });
    } catch(e) {
        console.log("Exception for shop - "+aShop.key+" Error - "+e);
    }

    });
});
//});