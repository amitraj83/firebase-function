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


exports.sendNotifications = functions.pubsub.schedule('every 1 minutes').onRun((context) => {

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
    return db.ref("barbers/"+aShop.key).once("value").then( (snapshot) => {
                                    var statuses = {};
                                     snapshot.forEach((barber) => {
                                        statuses[barber.key] = barber.child("queueStatus").val();
                                     });
                                     return (statuses);
                                 })
                                 .catch((error) => {
                                     console.log("["+aShop.key+"] "+"in barberwithstatus: error - "+error.toString());
                                 });


}

function listOfBarberQueues(aShop, barberStatuses) {
    return db.ref("barberWaitingQueues/"+aShop.key+"_"+today).once("value")
                .then( (snapshot) => {
                var barberQueues = new Array();
                 snapshot.forEach((barber) => {
                     var avgTimeToCut = aShop.child("avgTimeToCut").val();
                     var status = barberStatuses[barber.key];
                     var barberQueue = new BarberQueue(barber.key, aShop.key, status, avgTimeToCut);
                     barberQueues.push(barberQueue);
                     barber.forEach((customer) => {
                            barberQueue.addCustomer(customer);

                     })
                 });
                return (barberQueues);
            })
            .catch((error) => {
                console.log("["+aShop.key+"] "+"in ListofBarberQueues - error -> "+error);
            });

}

function barberSortedList(aShop, barberQueues) {

    var listBarberSorted = new Array();
    barberQueues.forEach(barberQueue => {
        var barberStatus = barberQueue.getStatus();
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
}

function removeAndGetAllCustomerToBeAddedLater(aShop, barberQueues, barberSortedList ) {
//All Customer in the queue should be removed and put in a set.

    return new Promise((resolve, reject) => {
        var allQueuedCustomerSorted = new Array();
        var eachPromises = new Array();
            barberQueues.forEach(barberQueue => {
                if (Object.exists(barberQueue)) {
                    barberQueue.getCustomers().forEach(customer => {
                        if (Object.exists(customer)) {
                            if (customer.child("status").val() === "QUEUE") {
                                var custInJSON = customer.toJSON();
                                allQueuedCustomerSorted.push(custInJSON);
                                db.ref("barberWaitingQueues").child(barberQueue.getShopKey()+"_"+today)
                                                                            .child(barberQueue.getKey()).child(customer.key)
                                                                            .ref.remove();

                            }
                        }
                    });
                }
                resolve(allQueuedCustomerSorted);
            });
        return Promise.all([allQueuedCustomerSorted]);
    })
    .catch((error) => {
        console.log("Error while removeAndGetAllCustomerToBeAddedLater: "+error)
    });

}


function assignCustomersToBarbers(aShop, barberQueues, sortedListOfBarbers, sortedListOfCustomer) {

    var sequence = Promise.resolve();

        var placeInQueue = 1;
        sortedListOfCustomer.forEach(customer => {

            sequence = sequence
            .then(() => {

                var barberKey = "";
                if(Object.exists(customer) && Object.exists(customer.anyBarber) && customer.anyBarber === true) {
                console.log("["+aShop.key+"] "+"To select sortedListOfBarbers - "+JSON.stringify(sortedListOfBarbers));
                    barberKey = sortedListOfBarbers[0].getKey();
                } else {
                    barberKey = customer.preferredBarberKey;
                }
                if (Object.exists(barberKey) && barberKey !== "") {

                     return db.ref("barberWaitingQueues").child(aShop.key+"_"+today).child(barberKey)
                     .child(customer.key)
                    .set(customer)
                    .then(() => {
                        console.log("["+aShop.key+"] "+"1 - sortedListOfBarbers : "+JSON.stringify(sortedListOfBarbers));
                        for(var i = 0 ; i < sortedListOfBarbers.length ; i++) {
                            var sortedBarber = sortedListOfBarbers[i];
                            if(sortedBarber.getKey() === barberKey) {
                                sortedBarber.setTimeToGetAvaialble(sortedBarber.getTimeToGetAvaialble() + sortedBarber.getAvgServiceTime());
                            }
                        }
                        return sortedListOfBarbers.sort(CompareForBarberSorted);

                     })
                     .then((sortedListOfBarbers) => {
                        return db.ref("barberWaitingQueues").child(aShop.key+"_"+today).child(barberKey)
                                     .child(customer.key)
                                     .child("timeAdded").set(placeInQueue++);
                     })
                     .catch((error) => {
                       console.log("["+aShop.key+"] "+"Reallocation of customer is failed. Trying again - "+customer.key);
                       throw error;
                     });
                }

                return true;


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
                return aShopDetail.child("avgTimeToCut").val();
            })
            .catch((error) => {
                  throw error;
              });
        return Promise.all([shop, avgTimeToCut]);

    })
    .then( (promiseReceived) => {
        var shop = promiseReceived[0];
        var avgTimeToCut = promiseReceived[1];

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
                var custStatus = customer.child("status").val();
                if(!Object.exists(custStatus)) {
                    return;
                }


                 if (Object.exists(custStatus) && custStatus === "PROGRESS") {
                     inProgressCustomer = customer;

                     inProgressCustomerServiceStartTime = customer.child("serviceStartTime").val();

                 } else if (Object.exists(custStatus) && custStatus === "QUEUE") {
                      inQueueCustomers.push(customer);

                 }
            });
            //Here is the main logic
            if(Object.exists(inQueueCustomers)) {
                inQueueCustomers = inQueueCustomers.sort(INCustomerComparator);
            }

            var prevCustomerTime = 0;

            for(var i = 0 ; i < inQueueCustomers.length ; i++) {
                var customer = inQueueCustomers[i];
                var newTimeToWait;

                if ( i === 0 ) {
                    //first customer

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
                } else {
                    //Not the first customer
                    newTimeToWait = prevCustomerTime + avgTimeToCut;
                    prevCustomerTime = newTimeToWait;
                }

                if(Object.exists(newTimeToWait)) {
                    customer.ref.child("expectedWaitingTime").set(newTimeToWait);

                }
            }

         });
         return true;
    }).catch((error) => {
        console.log(error);
    });





}


exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
//Following should run for each shop

db.ref("shopDetails").once("value", (snapshot) => {
    snapshot.forEach((aShop) => {
    try {
        var sShopAvgTimeToCut = aShop.child("avgTimeToCut").val();
        //transaction starts here on a shop
        db.ref("barberWaitingQueues/"+aShop.key+"_"+today)
        .once("value")
        .then(function(dataSnapshot) {
            console.log("Children Count: "+dataSnapshot.hasChildren());
            if (dataSnapshot.hasChildren() === true) {

        var shopQueuesReference = db.ref("barberWaitingQueues/"+aShop.key+"_"+today);
        shopQueuesReference.transaction((shopQueuesJSON) => {
            if (shopQueuesJSON !== null) {
                console.log("["+aShop.key+"] "+"json returned null");
                return ; //abort transaction
            } else {
            //Performe re-allocation
            return Promise.all([aShop]).then( (promiseReceived) => {
            var promiseShop = promiseReceived[0];
            var barberStatusespromise = barberWithStatus(promiseShop);
            return Promise.all([promiseReceived[0], barberStatusespromise]);
            })
            .then( (promiseReceived) => {
            //real all data
            var promiseShop = promiseReceived[0];
            var barberStatuses = promiseReceived[1];
            return Promise.all([promiseShop, listOfBarberQueues(promiseShop, barberStatuses)]);
            })
            .then( (promiseReceived) => {
                //sortedListOfBarbersForReAllocation
                var promiseShop = promiseReceived[0];
                var barberQueues = promiseReceived[1];
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
            var tempPromise = removeAndGetAllCustomerToBeAddedLater(promiseShop, barberQueues, barberSortedList);
            return Promise.all([promiseShop, barberQueues, barberSortedList, tempPromise]);
            })
            .then( (promiseReceived) => {
            var promiseShop = promiseReceived[0];
            var barberQueues = promiseReceived[1];
            var barberSortedList = promiseReceived[2];
            var allQueuedCustomerSorted = promiseReceived[3];
            allQueuedCustomerSorted = allQueuedCustomerSorted.sort(CustomerComparator);
            //assignCustomersToBarbers
            var shopSnapshotInJSON = assignCustomersToBarbers(promiseShop, barberQueues, barberSortedList, allQueuedCustomerSorted);
            return Promise.all([promiseShop, shopSnapshotInJSON]);
            })
            .then((promiseReceived) => {
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
        })
        .catch(e => {
            console.log("Exception for shop Datasnapshot - "+aShop.key+" Error - "+e);
        });
    } catch(e) {
        console.log("Exception for shop - "+aShop.key+" Error - "+e);
    }

    });
});
return true;
});