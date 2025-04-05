// backend/utils/firestoreMappers.js
const { Timestamp } = require('../config/firebase');

// Convert MongoDB ObjectId to string
const objectIdToString = (objectId) => {
  if (!objectId) return null;
  return objectId.toString();
};

// Convert MongoDB document to Firestore document
const mongoToFirestore = (mongoDoc) => {
  if (!mongoDoc) return null;
  
  // Create a copy of the document to avoid modifying the original
  const firestoreDoc = { ...mongoDoc };
  
  // Convert _id to id if it exists
  if (firestoreDoc._id) {
    firestoreDoc.id = objectIdToString(firestoreDoc._id);
    delete firestoreDoc._id;
  }
  
  // Convert ObjectId references to strings
  Object.keys(firestoreDoc).forEach(key => {
    const value = firestoreDoc[key];
    
    // Check if the value is a MongoDB ObjectId
    if (value && typeof value === 'object' && value.constructor.name === 'ObjectID') {
      firestoreDoc[key] = objectIdToString(value);
    }
    
    // Convert Date objects to Firestore Timestamps
    if (value instanceof Date) {
      firestoreDoc[key] = Timestamp.fromDate(value);
    }
    
    // Handle nested objects and arrays
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        // Map each item in the array
        firestoreDoc[key] = value.map(item => {
          if (item && typeof item === 'object') {
            return mongoToFirestore(item);
          }
          return item;
        });
      } else if (!(value instanceof Date)) {
        // Recursively map nested objects that aren't Dates
        firestoreDoc[key] = mongoToFirestore(value);
      }
    }
  });
  
  return firestoreDoc;
};

// Convert Firestore document to MongoDB-like document
const firestoreToMongo = (firestoreDoc) => {
  if (!firestoreDoc) return null;
  
  // Create a copy of the document to avoid modifying the original
  const mongoDoc = { ...firestoreDoc };
  
  // Convert id to _id if it exists
  if (mongoDoc.id) {
    mongoDoc._id = mongoDoc.id;
    delete mongoDoc.id;
  }
  
  // Convert Firestore Timestamps to Date objects
  Object.keys(mongoDoc).forEach(key => {
    const value = mongoDoc[key];
    
    // Check if the value is a Firestore Timestamp
    if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
      mongoDoc[key] = value.toDate();
    }
    
    // Handle nested objects and arrays
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        // Map each item in the array
        mongoDoc[key] = value.map(item => {
          if (item && typeof item === 'object') {
            return firestoreToMongo(item);
          }
          return item;
        });
      } else if (value.toDate && typeof value.toDate === 'function') {
        // Already handled Timestamps above
      } else {
        // Recursively map nested objects
        mongoDoc[key] = firestoreToMongo(value);
      }
    }
  });
  
  return mongoDoc;
};

// Process query parameters
const processQueryParams = (queryObj) => {
  const processedQuery = {};
  
  if (!queryObj) return processedQuery;
  
  Object.entries(queryObj).forEach(([key, value]) => {
    // Handle special MongoDB operators
    if (key.startsWith('$')) {
      // MongoDB logical operators like $and, $or
      // These would need custom handling for Firestore
      console.warn(`MongoDB operator ${key} not directly supported in Firestore query`);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle MongoDB comparison operators
      const firestoreConditions = {};
      
      Object.entries(value).forEach(([operator, operand]) => {
        switch (operator) {
          case '$eq': firestoreConditions['=='] = operand; break;
          case '$gt': firestoreConditions['>'] = operand; break;
          case '$gte': firestoreConditions['>='] = operand; break;
          case '$lt': firestoreConditions['<'] = operand; break;
          case '$lte': firestoreConditions['<='] = operand; break;
          default:
            console.warn(`MongoDB operator ${operator} not directly supported in Firestore query`);
        }
      });
      
      processedQuery[key] = firestoreConditions;
    } else {
      // Simple equality condition
      processedQuery[key] = value;
    }
  });
  
  return processedQuery;
};

module.exports = {
  objectIdToString,
  mongoToFirestore,
  firestoreToMongo,
  processQueryParams
};