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
var date = new Date();

const today = moment(date).utcOffset('+0100').format('DDMMYYYY');

/*
exports.scheduledFunction = functions.pubsub.schedule('every 1 minutes').onRun((context) => {

var date = new Date();
const today = moment(date).utcOffset('+0100').format('DDMMYYYY');
var db = admin.database();
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
  retun this.barberStatus;
};
BarberQueue.prototype.getKey = function() {
  retun this.barberKey;
};
BarberQueue.prototype.getShopKey = function() {
  retun this.shopKey;
};
BarberQueue.prototype.getAvgTimeToCut = function() {
  retun this.avgTimeToCut;
};
BarberQueue.prototype.getCustomers = function() {
  retun this.customers;
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
    } else if (c1Time == c2Time) {
        return 0;
    } else {
        return -1;
    }
}

Object.exists = function(obj) {
    return typeof obj !== "undefined" && obj !== null;
}

function shopDetails() {
    return new Promise(function(resolve, reject) {
        var shopInfo = new Array();
        db.ref("shopDetails").once("value", function(snapshot) {
            snapshot.forEach((shop) => {
                shopInfo[shop.key] = shop.child("avgTimeToCut").val();
            });
            resolve(shopInfo);
        });
    });
}

function barberWithStatus(promiseReceived) {
    
    promiseReceived[1] =  new Promise(function(resolve, reject) {
                                var statuses = {};
                                db.ref("barbers").once("value", function(snapshot) {
                                    snapshot.forEach((shop) => {
                                         shop.forEach((barber) => {
                                            statuses[barber.key] = barber.child("queueStatus").val();
                                         })
                                     });
                                     resolve(statuses);
                                 });
                                return reject();
                            });
    return Promise.all(promiseReceived);
}

function listOfBarberQueues(promiseReceived) {

    promiseReceived[2] = new Promise(function(resolve, reject) {
            db.ref("barberWaitingQueues").once("value", function(snapshot) {
                var barberQueues = new Array();
                snapshot.forEach((shop) => {
                     if (shop.key.endsWith(today) ) {
                         shop.forEach((barber) => {
                            var avgTimeToCut = promiseReceived[0][barber.key];
                            var barberQueue = new BarberQueue(barber.key, shop.key.substring(0, shop.key.indexOf("_")), status, avgTimeToCut);
                             barber.forEach((customer) => {
                                    barberQueue.addCustomer(customer);
                                 barberQueues.push(barberQueue);
                             })
                         })
                     }
                    
                });
                resolve(barberQueues);
            });
            return reject();
        });
    return Promise.all([promiseReceived]);
}

function barberSortedList(promiseReceived) {
    //Filter out barbers who are stopped
    //return the list of barbers sorted by time to become avaialble
    var barberQueues = promiseReceived[2];
    var listBarberSorted = new Array();
    barberQueues.forEach(barberQueue => {
        var barberStatus = barberQueue.getStatus();
        if (barberStatus !== "STOP") {
            //Calculate time for a barber to become available
            var remainingMinsToComplete = -1;
            var avgTimeToCut = 15;
            if(Object.exists(promiseReceived[0][barberQueue.getKey()])) {
                avgTimeToCut = promiseReceived[0][barberQueue.getKey()];
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

function removeAndGetAllCustomerToBeAddedLater(promiseReceived) {
//All Customer in the queue should be removed and put in a set.
    var allQueuedCustomerSorted = new Array();
    var barberQueues = promiseReceived[2];
    barberQueues.forEach(barberQueue => {
        if (Object.exists(barberQueue)) {
            barberQueue.getCustomers().forEach(customer => {
                if (Object.exists(customer)) {
                    if (customer.child("status").val() === "QUEUE") {
                        
                        db.ref("barberWaitingQueues").child(barberQueue.getShopKey()).child(barberQueue.getKey()).child(customer.key).remove()
                        .then(function() {
                            console.log("Remove succeeded.")
                            allQueuedCustomerSorted.push(customer);
                            return true;
                          })
                          .catch(function(error) {
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
            db.ref("barberWaitingQueues").child(currentShopKey).child(barberKey).child(customer.key).set(customer.toJSON())
            .then(function() {
               console.log('Customer rellatocation successfully for customer - '+customer.key);
               return true;
             })
             .catch(function(error) {
               console.log('Reallocation of customer is failed. Trying again - '+customer.key);
                db.ref("barberWaitingQueues").child(currentShopKey).child(barberKey).child(customer.key).set(customer.toJSON());
             });
            sortedListOfBarbers.forEach(sortedBarber => {
                if(sortedBarber.getKey() === barberKey) {
                    sortedBarber.setTimeToGetAvaialble(sortedBarber.getTimeToGetAvaialble() + sortedBarber.getAvgServiceTime());
                }
            });
        }
        sortedListOfBarbers = sortedListOfBarbers.sort(CompareForBarberSorted);
    });
    promiseReceived[3] = sortedListOfBarbers;
    
    return Promise.all(promiseReceived);
}

function updateWaitingTimes(promiseReceived) {
    
    db.ref("barberWaitingQueues").once("value", function(snapshot) {
        
        snapshot.forEach((shop) => {
             if (shop.key.endsWith(today) ) {
                 
                 new Promise(function (resolve, reject) {
                     
                     db.ref("shopDetails/"+shop.key).once("value", function(snapshot) {
                                return resolve(snapshot.child("avgTimeToCut").val());
                        });
                     
                      return reject();
                    })
                    .then(function (avgTimeToCut) {
                        
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
                            inQueueCustomers = inQueueCustomers.sort(CustomerComparator);
                            
                            
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
                    });
                 
                 
                 
                 
             }

        });
        resolve(barberQueues);
    });

return true;
}

new Promise(function (resolve, reject) {
  return true;
})
.then(function () {
    return shopDetails();
})
.then(function () {
return barberWithStatus();
})
.then(function (barbersWithStatuses) {
//real all data
return listOfBarberQueues();
})
.then(function (listOfBarberQueues) {
//sortedListOfBarbersForReAllocation
return barberSortedList();
})
.then(function (barberSortedList){
//removeAndGetAllCustomerToBeAddedLater
return removeAndGetAllCustomerToBeAddedLater();
})
.then(function (allCustomers){
//assignCustomersToBarbers
return assignCustomersToBarbers();
})
.then(function (barberMap) {
// updateWaitingTimes
return updateWaitingTimes();
})
.catch(function (error) {
console.log(error); // 'Some terrrrible error.'
});

