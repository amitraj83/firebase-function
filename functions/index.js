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
    this.avgTimeToCut = timeToCut;
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
        return 1;
}

function getCustomerTime (customer) {
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

Object.exists = function(obj) {
    return typeof obj !== "undefined" && obj !== null;
}


function barberWithStatus(promiseReceived) {
    console.log("in barberwithstatus: aShop - "+promiseReceived[0]);
    var aShop = promiseReceived[0];
    console.log("in barberwithstatus 1: aShop - "+aShop);
    promiseReceived[1] = db.ref("barbers/"+aShop.key).once("value", (snapshot) => {
                                    var statuses = new Array();
                                     snapshot.forEach((barber) => {
                                        statuses[barber.key] = barber.child("queueStatus").val();
                                     })
                                     return (statuses);
                                 });


    return Promise.all(promiseReceived);
}

function listOfBarberQueues(promiseReceived) {
    var aShop = promiseReceived[0];
    console.log("waiting queue ref : "+aShop.key+"_"+today);
    promiseReceived[2] = db.ref("barberWaitingQueues/"+aShop.key+"_"+today).once("value", (snapshot) => {
                var barberQueues = new Array();
                 snapshot.forEach((barber) => {
                     var avgTimeToCut = promiseReceived[0].avgTimeToCut;
                     console.log("listOfBarberQueues => avgTimeToCut : "+avgTimeToCut);
                     var status = promiseReceived[1][barber.key];
                     console.log("listOfBarberQueues => status : "+status);
                     var barberQueue = new BarberQueue(barber.key, aShop.key, status, avgTimeToCut);
                     barberQueues.push(barberQueue);
                     barber.forEach((customer) => {
                            barberQueue.addCustomer(customer);

                     })
                 });
                console.log("in ListofBarberQueues - return -> "+barberQueues);
                return (barberQueues);
            });


    return Promise.all([promiseReceived]);
}

function barberSortedList(promiseReceived) {
    var aShop = promiseReceived[0];
    //Filter out barbers who are stopped
    //return the list of barbers sorted by time to become avaialble
    var barberQueues = promiseReceived[2];
    console.log("Barber queues : "+barberQueues);

    var listBarberSorted = new Array();
    barberQueues.forEach(barberQueue => {
        var barberStatus = barberQueue.getStatus();
        if (barberStatus !== "STOP") {
            //Calculate time for a barber to become available
            var remainingMinsToComplete = -1;
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
            listBarberSorted.push(new BarberSorted(barberQueue.getKey, remainingMinsToComplete, avgTimeToCut) ) ;
        }
    });
    promiseReceived[3] = listBarberSorted.sort(CompareForBarberSorted);
    
    return Promise.all(promiseReceived);
}

function removeAndGetAllCustomerToBeAddedLater(promiseReceived ) {
//All Customer in the queue should be removed and put in a set.
    var aShop = promiseReceived[0];
    var allQueuedCustomerSorted = new Array();
    var barberQueues = promiseReceived[2];
    barberQueues.forEach(barberQueue => {
        if (Object.exists(barberQueue)) {
            barberQueue.getCustomers().forEach(customer => {
                if (Object.exists(customer)) {
                    if (customer.child("status").val() === "QUEUE") {
                        
                        db.ref("barberWaitingQueues").child(barberQueue.getShopKey()).child(barberQueue.getKey()).child(customer.key).ref.remove()
                        .then(() => {
                            console.log("Remove succeeded.")
                            allQueuedCustomerSorted.push(customer);
                            return true;
                          })
                          .catch((error) => {
                            console.log("Remove failed: " + error.message)
                          });
                    }
                }
            });
        }
    });
    promiseReceived[4] = allQueuedCustomerSorted.sort(CustomerComparator);
    return Promise.all(promiseReceived);
}

function assignCustomersToBarbers(promiseReceived) {
    var aShop = promiseReceived[0];
    var sortedListOfCustomer = promiseReceived[4];
    var sortedListOfBarbers = promiseReceived[3];
    var placeInQueue = 1;
    
    sortedListOfCustomer.forEach(customer => {
        var barberKey = "";
        if(Object.exists(customer) && Object.exists(customer.child("anyBarber")) && customer.child("anyBarber").val() === true) {
            barberKey = sortedListOfBarbers[0].getKey();
        } else {
            barberKey = customer.child("preferredBarberKey").val();
        }
        if (Object.exists(barberKey) && barberKey !== "") {
            customer.child("timeAdded").set(placeInQueue++);
            db.ref("barberWaitingQueues").child(aShop.key+"_"+today).child(barberKey).child(customer.key).set(customer.toJSON())
            .then(() => {
               console.log('Customer rellatocation successfully for customer - '+customer.key);
               sortedListOfBarbers.forEach(sortedBarber => {
                   if(sortedBarber.getKey() === barberKey) {
                       sortedBarber.setTimeToGetAvaialble(sortedBarber.getTimeToGetAvaialble() + sortedBarber.getAvgServiceTime());
                       sortedListOfBarbers = sortedListOfBarbers.sort(CompareForBarberSorted);
                   }
               });
               return true;
             })
             .catch((error) => {
               console.log('Reallocation of customer is failed. Trying again - '+customer.key);
                db.ref("barberWaitingQueues").child(currentShopKey).child(barberKey).child(customer.key).set(customer.toJSON());
                sortedListOfBarbers.forEach(sortedBarber => {
                   if(sortedBarber.getKey() === barberKey) {
                       sortedBarber.setTimeToGetAvaialble(sortedBarber.getTimeToGetAvaialble() + sortedBarber.getAvgServiceTime());
                       sortedListOfBarbers = sortedListOfBarbers.sort(CompareForBarberSorted);
                   }
               });
             });

        }

    });
    promiseReceived[3] = sortedListOfBarbers;
    
    return Promise.all(db.ref("barberWaitingQueues").child(aShop.key+"_"+today).toJSON());
}

function updateWaitingTimes(aShopKey) {
    
    db.ref("barberWaitingQueues/"+aShopKey+"_"+today).once("value", (shop) => {
        
         new Promise( (resolve, reject) => {

            return db.ref("shopDetails/"+aShopKey).once("value", (snapshot) => {
                        return resolve(snapshot.child("avgTimeToCut").val());
                });


            })
            .then( (avgTimeToCut) => {

                shop.forEach((barber) => {
                    //here we need to update the timings
                    var inQueueCustomers = new Array();
                    var inProgressCustomer;
                    var inProgressCustomerServiceStartTime;


                    barber.forEach((customer) => {
                        var custStatus = customer.child("status").val();
                         if (Object.exists(custStatus) && custStatus === "PROGRESS") {
                             inProgressCustomer = customer;
                             inProgressCustomerServiceStartTime = customer.child("serviceStartTime").val();
                         } else if (Object.exists(custStatus) && custStatus === "QUEUE") {
                              inQueueCustomers.push(customer);
                         }
                    })
                    //Here is the main logic
                    if(Object.exists(inQueueCustomers)) {
                        inQueueCustomers = inQueueCustomers.sort(CustomerComparator);
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


    });

return true;
}


exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
//Following should run for each shop

return db.ref("shopDetails").once("value", (snapshot) => {
    snapshot.forEach((aShop) => {
    try {
        console.log("Fetching shop avg time");
        var sShopAvgTimeToCut = aShop.child("avgTimeToCut").val();
        console.log("Fetched shop avg time");
        //transaction starts here on a shop
        console.log("Starting transaction for shop : "+aShop.key +" Today : "+today);
        var shopQueuesReference = db.ref("barberWaitingQueues/"+aShop.key+"_"+today);
        shopQueuesReference.transaction((shopQueuesJSON) => {
        console.log("first thing in the transaction - Shop Key : "+aShop.key)
        if (shopQueuesJSON !== null) {
            console.log("json returned null");
            return ; //abort transaction
        } else {
            //Performe re-allocation
            console.log("Starting re-allocation of customers" + aShop.key);
//            return new Promise(function (resolve, reject, aShop) {
//              var promiseReceived = new Array();
//              promiseReceived[0] = aShop;
//              console.log("Returning first promise: "+aShop.key);
//              resolve (promiseReceived);
//            })
            return Promise.all([aShop]).then( (promiseReceived) => {
            console.log("executing barberWithStatus "+promiseReceived[0]);
            console.log("executing barberWithStatus shop key: "+promiseReceived[0].key);
            return ( barberWithStatus(promiseReceived));
            })
            .then( (promiseReceived) => {
            //real all data
            console.log("executing listOfBarberQueues for shop - "+promiseReceived[0].key);
            return ( listOfBarberQueues(promiseReceived));
            })
            .then( (promiseReceived) => {
                //sortedListOfBarbersForReAllocation
                console.log("executing barberSortedList ");
                var barberQueues = promiseReceived[2];
                console.log("Barber queues : "+barberQueues);
                if (Object.exists(barberQueues)) {
                   return ( barberSortedList(promiseReceived));
                } else {
                     throw new Error("No barber queue exists for shop : "+promiseReceived[0].key);
                }
            })
            .then( (promiseReceived) => {
            //removeAndGetAllCustomerToBeAddedLater
            console.log("executing removeAndGetAllCustomerToBeAddedLater ");
            return ( removeAndGetAllCustomerToBeAddedLater(promiseReceived));
            })
            .then( (promiseReceived) => {
            //assignCustomersToBarbers
            console.log("executing assignCustomersToBarbers ");
            assignCustomersToBarbers(promiseReceived)
            return (promiseReceived[0] );
            })
            .catch( (error) => {
            console.log("Error while transaction execution: "+error); // 'Some terrrrible error.'
            });

            //transaction should ends here
            }
        },
        (error, committed, aShop) => {
          console.log("After transaction complete : "+aShop);
          console.log("After transaction complete 2 : "+aShop[0]);
          console.log("After transaction complete 3 : "+aShop[0]);
          if (error) {
            console.log('Transaction failed abnormally!', error);
          } else if (!committed) {
            console.log('We aborted the transaction.'+committed);
          } else {
            console.log('Transaction successful. Updating waiting times now');
            updateWaitingTimes(aShop.key);
          }

        });

        } catch(e) {
            console.log("Exception for shop - "+aShop.key);
        }

        });
    });
});