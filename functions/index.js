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
    projectId: "qcut-test"
};




var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://qcut-test.firebaseio.com"
});
firebase.initializeApp(config);

var db = admin.database();
//var moment = require('moment');
var date = new Date();

//const today = moment(date).utcOffset('+0100').format('DDMMYYYY');
var moment = require('moment-timezone');
const today = moment().tz("Europe/London").format('DDMMYYYY');

exports.sendNotifications = functions.pubsub.schedule('every 1 minutes').onRun((context) => {

    var ref = db.ref("barberWaitingQueues");


    return ref.once("value", function (snapshot) {

        var a = snapshot.numChildren();

        snapshot.forEach((shop) => {
            if (shop.key.endsWith(today)) {
                shop.forEach((barber) => {
                    barber.forEach((customer) => {
                        var customerStatus = customer.child("status").val();
                        if (customerStatus !== null && customerStatus === "QUEUE") {
                            var expectedWaitingTime = customer.child("expectedWaitingTime").val();
                            db.ref("Customers/" + customer.key + "/notificationFirebaseTokens").once("value", function (customerSnapshot) {
                                if (customerSnapshot.exists()) {
                                    customerSnapshot.forEach((deviceid) => {
                                        var registrationToken = deviceid.val();
                                        console.log(deviceid.key + " -- " + registrationToken);
                                        if (registrationToken !== null && registrationToken !== '') {
                                            var message = {
                                                android: {
                                                    priority: "high"
                                                },
                                                data: {
                                                    "waitingTime": String(expectedWaitingTime)
                                                },
                                                token: registrationToken
                                            };

                                            admin.messaging().send(message)
                                                .then((response) => {
                                                    console.log('Successfully sent message for customer - ' + customer.key, response);
                                                    return true;
                                                }).catch((error) => {
                                                    console.log('Error sending message for customer - ' + customer.key, error);
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
                console.log("its not today key :" + shop.key);
                db.ref("archivedQueues").child(shop.key).set(shop.toJSON())
                    .then(function () {
                        console.log('Shop key archived successfully - ' + shop.key);
                        db.ref("barberWaitingQueues").child(shop.key).remove();
                        return true;
                    })
                    .catch(function (error) {
                        console.log('Shop Archive failed - ' + shop.key);
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
BarberQueue.prototype.getStatus = function () {
    return this.barberStatus;
};
BarberQueue.prototype.getKey = function () {
    return this.barberKey;
};
BarberQueue.prototype.getShopKey = function () {
    return this.shopKey;
};
BarberQueue.prototype.getAvgTimeToCut = function () {
    return this.avgTimeToCut;
};
BarberQueue.prototype.getCustomers = function () {
    return this.customers;
};

BarberQueue.prototype.addCustomer = function (customer) {
    this.customers.push(customer);
};

function BarberSorted(key, timeToGetAvailable, avgServiceTime) {
    this.key = key;
    this.timeToGetAvailable = timeToGetAvailable;
    this.avgServiceTime = avgServiceTime;
}

BarberSorted.prototype.getKey = function () {
    return this.key;
};
BarberSorted.prototype.setTimeToGetAvaialble = function (timeToGetAvailable) {
    this.timeToGetAvailable = timeToGetAvailable;
};

BarberSorted.prototype.getTimeToGetAvaialble = function () {
    return this.timeToGetAvailable;
};
BarberSorted.prototype.getAvgServiceTime = function () {
    return this.avgServiceTime;
};


function CompareForBarberSorted(BarberSorted1, BarberSorted2) {
    if (BarberSorted1.timeToGetAvailable > BarberSorted2.timeToGetAvailable)
        return 1;
    if (BarberSorted1.timeToGetAvailable === BarberSorted2.timeToGetAvailable)
        return 0;
    else
        return -1;
}

function getCustomerTime(customer) {
    var customerDragTime = customer.dragAdjustedTime;

    if (Object.exists(customerDragTime)) {
        if (customerDragTime === 0) {
            return customer.arrivalTime;
        } else {
            return customerDragTime;
        }
    } else {
        return customer.arrivalTime;
    }
}
function CustomerComparator(customer1, customer2) {
    var c1Time = getCustomerTime(customer1);
    var c2Time = getCustomerTime(customer2);

    if (c1Time > c2Time) {
        return 1;
    } else if (c1Time === c2Time) {
        return 0;
    } else {
        return -1;
    }
}

function getCustomerTimeSNAP(customer) {
    var customerArrivalTime = customer['arrivalTime'];
    var customerDragTime = customer['dragAdjustedTime'];
    if (Object.exists(customerDragTime)) {
        if (customerDragTime === 0) {
            return customerArrivalTime;
        } else {
            return customerDragTime;
        }
    } else {
        return customerArrivalTime;
    }
}

function INCustomerComparator(customer1, customer2) {
    var c1Time = getCustomerTimeSNAP(customer1);
    var c2Time = getCustomerTimeSNAP(customer2);

    if (c1Time > c2Time) {
        return 1;
    } else if (c1Time === c2Time) {
        return 0;
    } else {
        return -1;
    }
}


Object.exists = function (obj) {
    return typeof obj !== "undefined" && obj !== null;
}


function barberWithStatus(shopKey) {
    return db.ref("barbers/" + shopKey).once("value").then((barbersSnapshot) => {
        var statuses = {};
        barbersSnapshot.forEach((barber) => {
            statuses[barber.key] = barber.child("queueStatus").val();
        });
        return (statuses);
    }).catch((error) => {
        console.log("[" + shopKey + "] " + "in barberwithstatus: error - " + error.toString());
    });
}

function barberSortedList(barberQueues) {

    var listBarberSorted = new Array();
    barberQueues.forEach(barberQueue => {
        var barberStatus = barberQueue.getStatus();
        if (barberStatus !== "STOP") {
            //Calculate time for a barber to become available
            var remainingMinsToComplete = 0;
            var avgTimeToCut = barberQueue.getAvgTimeToCut();
            barberQueue.getCustomers().forEach(customer => {
                if (customer['status'] === "PROGRESS") {
                    var serviceStartTime = customer['serviceStartTime'];
                    var currentTimeInMiliSeconds = moment().utcOffset('+0100').valueOf();
                    var minutesPassedSinceStarted = (((currentTimeInMiliSeconds - serviceStartTime) / 1000) / 60);

                    remainingMinsToComplete = avgTimeToCut - minutesPassedSinceStarted;
                    if (remainingMinsToComplete < 0) {
                        remainingMinsToComplete = 0;
                    }
                }

            });
            listBarberSorted.push(new BarberSorted(barberQueue.getKey(), remainingMinsToComplete, avgTimeToCut));
        }
    });
    return listBarberSorted.sort(CompareForBarberSorted);
}

function shopKey(key) {
    return key + "_" + today;
}

exports.reAllocateCustomers = functions.pubsub.schedule('every 1 minutes').onRun((context) => {
    //Following should run for each shop

    db.ref("shopDetails").once("value", (snapshot) => {
        snapshot.forEach((aShop) => {
            reShuffleCustomerInOneShop(aShop.key, aShop.child("avgTimeToCut").val());
        });
    });
    return true;
});


function CustomerObject(key, name, expectedWaitingTime, dragAdjustedTime, arrivalTime, serviceStartTime,
    actualProcessingTime, lastPositionChangedTime, status, preferredBarberKey,
    placeInQueue, channel, addedBy) {
    this.key = key;
    this.name = name;
    this.expectedWaitingTime = expectedWaitingTime;
    this.dragAdjustedTime = dragAdjustedTime;
    this.arrivalTime = arrivalTime;
    this.serviceStartTime = serviceStartTime;
    this.actualProcessingTime = actualProcessingTime;
    this.lastPositionChangedTime = lastPositionChangedTime;
    this.status = status;
    this.preferredBarberKey = preferredBarberKey;
    this.placeInQueue = placeInQueue;
    this.channel = channel;
    this.addedBy = addedBy;
}

function assignOneCustomerToBarber(queue, shopId, avgTimeToCut, barberKey, customerKey, customerName, channel, preferredBarberKey) {
    if (!Object.exists(customerKey) || customerKey === "") {
        customerKey = db.ref("barberWaitingQueues").child(shopKey(shopId)).child(barberKey).push().key;
        console.log("[assignOneCustomerToBarber] new customerKey : " + customerKey);
    }

    var customerInQueue = 0;
    console.log(queue)
    for (const [custId, customer] of Object.entries(queue)) {
        if (customer['status' === "QUEUE"]) {
            customerInQueue++;
        }
    }
    const arrivalTime = moment().tz("Europe/London").valueOf();
    var aCustomer = new CustomerObject(customerKey, customerName, 0, 0, arrivalTime,
        0, 0, 0, "QUEUE", preferredBarberKey, customerInQueue, channel, customerKey);
    console.log("Customer added : " + JSON.stringify(aCustomer));
    queue[customerKey] = aCustomer;
    updateWaitingTimeForAQueue(queue, avgTimeToCut);
}

exports.queueCustomer = functions.https.onCall((data, context) => {
    var returnStatus = "";
    var eventType = data.eventType; //ADD_CUSTOMER, PROGRESS_CUSTOMER, DONE_CUSTOMER, REMOVE_CUSTOMER

    if (eventType.toUpperCase() === "ADD_CUSTOMER") {
        var customerName = data.customerName;
        console.log("customerName : " + customerName);
        var customerKey = data.customerKey;
        console.log("customerKey : " + customerKey);
        var channel = data.channel;
        console.log("channel : " + channel);
        var shopKey = data.shopKey;
        console.log("shopKey : " + shopKey);
        var preferredBarberKey = data['preferredBarberKey'];
        console.log("preferredBarberKey : " + preferredBarberKey);

        return addCustomerEvent(customerName, customerKey, channel, shopKey, preferredBarberKey);

    } else if (eventType.toUpperCase() === "REALLOCATE") {
        shopKey = data.shopKey;
        return db.ref("shopDetails/" + shopKey).once("value", (snapshot) => {
            snapshot.forEach((aShop) => {
                reShuffleCustomerInOneShop(aShop.key, aShop.child("avgTimeToCut").val());
            });
        });
    }
    return returnStatus;
});


function removeAndGetAllCustomerToBeAddedLater(barberQueues, barberSortedList, shopQueues) {
    //All Customer in the queue should be removed and put in a set.
    var allQueuedCustomerSorted = new Array();
    barberQueues.forEach(barberQueue => {
        barberQueue.getCustomers().forEach(customer => {
            if (customer['status'] === "QUEUE") {
                // var custInJSON = customer.toJSON();
                allQueuedCustomerSorted.push(customer);
                //remove customer
                queue = shopQueues[barberQueue.getKey()];
                console.log('deleting: ' + queue);
                // delete queue[customer.getKey()]
            }
        });
        allQueuedCustomerSorted = allQueuedCustomerSorted.sort(CustomerComparator);
    });
    return allQueuedCustomerSorted;
}

function assignCustomersToBarbers(shopId, sortedListOfBarbers, sortedListOfCustomer, shopQueuesObj) {
    var placeInQueue = 1;
    sortedListOfCustomer.forEach(customer => {

        var barberKey = "";
        if (Object.exists(customer) && customer['preferredBarberKey'] === '') {
            console.log("[" + shopId + "] " + "To select sortedListOfBarbers - " + JSON.stringify(sortedListOfBarbers));
            barberKey = sortedListOfBarbers[0].getKey();
        } else {
            barberKey = customer['preferredBarberKey'];
        }
        queue = shopQueuesObj[barberKey];
        var custId = customer['key'];
        queue[custId] = customer;
        customer['placeInQueue'] = placeInQueue++; //placeInQueue is not used anywhere
        console.log("[" + shopId + "] " + "1 - sortedListOfBarbers : " + JSON.stringify(sortedListOfBarbers));
        for (var i = 0; i < sortedListOfBarbers.length; i++) {
            var sortedBarber = sortedListOfBarbers[i];
            if (sortedBarber.getKey() === barberKey) {
                sortedBarber.setTimeToGetAvaialble(sortedBarber.getTimeToGetAvaialble() + sortedBarber.getAvgServiceTime());
            }
        }
        sortedListOfBarbers = sortedListOfBarbers.sort(CompareForBarberSorted);
    });
}

function updateWaitingTimes(shopQueuesObj, avgTimeToCut) {
    var entries = Object.entries(shopQueuesObj);
    for (const [barberId, queue] of entries) {
        console.log("Updating times: barber: " + barberId);
        updateWaitingTimeForAQueue(queue, avgTimeToCut);
    }
    console.log("Updating times: aShopKey: ");
}

function updateWaitingTimeForAQueue(queue, avgTimeToCut) {
    var queueEntries = Object.entries(queue);
    //here we need to update the timings
    var inQueueCustomers = new Array();
    var inProgressCustomer;
    var inProgressCustomerServiceStartTime;
    for (const [custId, customer] of queueEntries) {
        var custStatus = customer['status'];
        if (custStatus === "PROGRESS") {
            inProgressCustomer = customer;
            inProgressCustomerServiceStartTime = customer['serviceStartTime'];
        }
        else if (custStatus === "QUEUE") {
            inQueueCustomers.push(customer);
        }
    }
    //Here is the main logic
    if (Object.exists(inQueueCustomers)) {
        inQueueCustomers = inQueueCustomers.sort(INCustomerComparator);
    }
    var prevCustomerTime = 0;
    for (var i = 0; i < inQueueCustomers.length; i++) {
        var customer = inQueueCustomers[i];
        var newTimeToWait;
        if (i === 0) {
            //first customer
            if (Object.exists(inProgressCustomer) && Object.exists(inProgressCustomerServiceStartTime)) {
                //first customer in progress
                var currentTimeInMiliSeconds = moment().utcOffset('+0100').valueOf();
                var timeToWait = avgTimeToCut - ((currentTimeInMiliSeconds - inProgressCustomerServiceStartTime) / 60000);
                timeToWait = timeToWait.toFixed(0);
                newTimeToWait = Math.max(0, timeToWait);
            }
            else {
                //first customer not in progress
                newTimeToWait = 0;
            }
            prevCustomerTime = newTimeToWait;
        }
        else {
            //Not the first customer
            newTimeToWait = prevCustomerTime + avgTimeToCut;
            prevCustomerTime = newTimeToWait;
        }
        if (Object.exists(newTimeToWait)) {
            customer['expectedWaitingTime'] = newTimeToWait;
        }
    }
}

function reShuffleCustomerInOneShop(shopId, shopAvgTimeToCut) {
    var returnStatus = "";
    try {
        var barberStatusesPromise = barberWithStatus(shopId);
        Promise.all([barberStatusesPromise]).then((promisesReceived) => {
            var barberStatuses = promisesReceived[0];
            var shopQueuesReference = db.ref("barberWaitingQueues/" + shopKey(shopId));
            shopQueuesReference.transaction((shopQueuesObj) => {
                console.log('inside transaction: reShuffleCustomerInOneShop')
                if (!Object.exists(shopQueuesObj)) {
                    //no object received in this call, so ignore this call
                    console.log('shopQueuesObj no object received in this call, so ignore this call')
                    return shopQueuesObj;
                }
                console.log(barberStatuses);
                console.log(shopQueuesObj);
                for (const [barberId, status] of Object.entries(barberStatuses)) {
                    if (status !== 'STOP' && !Object.exists(shopQueuesObj[barberId])) {
                        //if queue does not exists for available barber than create one
                        console.log('Create queue for a barber as it does not exisits: ' + barberId);
                        shopQueuesObj[barberId] = {};
                    }
                }
                var barberQueues = buildBarberQueuesObj(shopQueuesObj, barberStatuses, shopId, shopAvgTimeToCut);
                var sortedBarberList = barberSortedList(barberQueues);
                var sortedAllCustList = removeAndGetAllCustomerToBeAddedLater(barberQueues, sortedBarberList, shopQueuesObj);
                assignCustomersToBarbers(shopId, sortedBarberList, sortedAllCustList, shopQueuesObj);
                updateWaitingTimes(shopQueuesObj, shopAvgTimeToCut);
                console.log(shopQueuesObj);
                return shopQueuesObj;
            }, (error, committed, shopQueuesObj) => {
                if (error) {
                    returnStatus = "Transaction failed abnormally!"
                    console.log('Transaction failed abnormally!', error);
                } else if (!committed) {
                    returnStatus = "We aborted the transaction."
                    console.log('We aborted the transaction.' + committed);
                } else {
                    returnStatus = "success"
                    console.log('Transaction successful.');
                }
            });
            return true;
        }).catch((error) => {
            returnStatus = "failure"
            console.log("Exception reallocateCustomersInOneShop - " + shopKey(shopId) + " Error - " + error);
        });
    }
    catch (e) {
        returnStatus = "failure"
        console.log("Exception for shop - " + shopId + " Error - " + e);
    }
    return returnStatus;
}
/**
 * This is for testing reshuffle
 */
// exports.reallocate = functions.https.onRequest((request, response) => {
//     console.log('addCustomer called');
//     var shopAvgTimeToCut = 15;//aShop.child("avgTimeToCut").val();
//     var shopId = '-M5hCL0DhhMJ9TM8jB0j';//aShop.key
//     // reShuffleCustomerInOneShop(shopId, shopAvgTimeToCut);
//     addCustomerEvent('cust1', '', 'DIRECT', shopId, '');
//     response.status(200).send({
//         status: 'success'
//     });
// });
function buildBarberQueuesObj(shopQueuesObj, barberStatuses, shopId, shopAvgTimeToCut) {
    var barberQueues = new Array();
    var entries = Object.entries(shopQueuesObj);
    for (const [barberId, queue] of entries) {
        var status = barberStatuses[barberId];
        var barberQueue = new BarberQueue(barberId, shopId, status, shopAvgTimeToCut);
        barberQueues.push(barberQueue);
        var queueEntries = Object.entries(queue);
        for (const [custId, customer] of queueEntries) {
            barberQueue.addCustomer(customer);
        }
    }
    return barberQueues;
}

function fetchShop(shopId) {
    return db.ref("shopDetails/" + shopId).once("value").then((aShop => {
        var avgTimeToCut = aShop.child("avgTimeToCut").val();
        return (avgTimeToCut);
    })).catch((error) => {
        console.log("fetchShop: [" + shopId + "] " + ": error - " + error.toString());
    });
}

function addCustomerEvent(customerName, customerKey, channel, shopId, preferredBarberKey) {
    var returnStatus = "";
    var barberStatusesPromise = barberWithStatus(shopId);
    Promise.all([barberStatusesPromise]).then((promisesReceived) => {
        var barberStatuses = promisesReceived[0];
        var avgTimeToCut = fetchShop(shopId);
        return Promise.all([barberStatuses, avgTimeToCut]);
    }).then((promisesReceived) => {
        var barberStatuses = promisesReceived[0];
        var avgTimeToCut = promisesReceived[1];
        console.log('addCustomerEvent')
        var shopQueuesReference = db.ref("barberWaitingQueues/" + shopKey(shopId));
        shopQueuesReference.transaction((shopQueuesObj) => {
            console.log('inside transaction: addCustomerEvent');
            if (!Object.exists(shopQueuesObj)) {
                //shopQueues can be null if there is no customer and barber is online
                var availableBarbers = {};
                for (const [barberId, status] of Object.entries(barberStatuses)) {
                    if (status !== 'STOP') {
                        availableBarbers[barberId] = {};
                    }
                }
                console.log(Object.keys(availableBarbers).length);
                if (Object.keys(availableBarbers).length > 0) {
                    shopQueuesObj = availableBarbers;
                } else {
                    //no object received in this call, so ignore this call
                    console.log('shopQueuesObj no object received in this call, so ignore this call' + shopQueuesObj)
                    return shopQueuesObj;
                }
            }
            //sortedListOfBarbersForReAllocation
            var barberQueues = buildBarberQueuesObj(shopQueuesObj, barberStatuses, shopId, avgTimeToCut);
            if (!Object.exists(preferredBarberKey) || preferredBarberKey === "") {
                //any barber
                var sortedBarberList = barberSortedList(barberQueues);
                const sortedBarber = sortedBarberList[0];
                barberKey = sortedBarber.getKey();
                assignOneCustomerToBarber(shopQueuesObj[barberKey], shopId, sortedBarber.getAvgServiceTime(),
                    barberKey, customerKey, customerName, channel, preferredBarberKey);
            } else {
                //preferred barber assignment
                assignOneCustomerToBarber(shopQueuesObj[preferredBarberKey], shopId, avgTimeToCut, preferredBarberKey,
                    customerKey, customerName, channel, preferredBarberKey);
            }
            return shopQueuesObj;
        }, (error, committed, shopQueuesObj) => {
            if (error) {
                returnStatus = "Transaction failed abnormally!"
                console.log('Transaction failed abnormally!', error);
            } else if (!committed) {
                returnStatus = "We aborted the transaction."
                console.log('We aborted the transaction.' + committed);
            } else {
                returnStatus = "success"
                console.log('Transaction successful.');
                reShuffleCustomerInOneShop(shopId, avgTimeToCut);
            }
        });
        return true;
    }).catch(e => {
        returnStatus = "failure";
        console.trace(e);
        console.log("Error while addCustomerEvent - " + e);
    });
    return returnStatus;
}

