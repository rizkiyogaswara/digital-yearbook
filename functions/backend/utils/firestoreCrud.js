// backend/utils/firestoreCrud.js
const { db, FieldValue, Timestamp } = require('../config/firebase');

// Convert Firestore document to a plain object with ID
const documentToObject = (doc) => {
  if (!doc.exists) return null;
  return {
    id: doc.id,
    ...doc.data()
  };
};

// Convert a collection of documents to an array of objects
const documentsToArray = (querySnapshot) => {
  return querySnapshot.docs.map(documentToObject);
};

// Create a new document in a collection
const createDocument = async (collectionName, data) => {
  try {
    const docRef = await db.collection(collectionName).add({
      ...data,
      createdAt: Timestamp.now()
    });
    const doc = await docRef.get();
    return documentToObject(doc);
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

// Update an existing document
const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.update({
      ...data,
      updatedAt: Timestamp.now()
    });
    const updatedDoc = await docRef.get();
    return documentToObject(updatedDoc);
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

// Get a document by ID
const getDocumentById = async (collectionName, docId) => {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    const doc = await docRef.get();
    return documentToObject(doc);
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
};

// Query documents in a collection
const queryDocuments = async (collectionName, queryObj = {}, options = {}) => {
  try {
    let query = db.collection(collectionName);
    
    // Apply filters
    Object.entries(queryObj).forEach(([field, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle comparison operators
        Object.entries(value).forEach(([operator, operand]) => {
          switch(operator) {
            case '$eq': query = query.where(field, '==', operand); break;
            case '$gt': query = query.where(field, '>', operand); break;
            case '$gte': query = query.where(field, '>=', operand); break;
            case '$lt': query = query.where(field, '<', operand); break;
            case '$lte': query = query.where(field, '<=', operand); break;
          }
        });
      } else {
        // Simple equality
        query = query.where(field, '==', value);
      }
    });
    
    // Apply sorting
    if (options.sort) {
      const [field, direction] = options.sort.split(':');
      query = query.orderBy(field, direction === 'desc' ? 'desc' : 'asc');
    }
    
    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const snapshot = await query.get();
    return documentsToArray(snapshot);
  } catch (error) {
    console.error(`Error querying documents in ${collectionName}:`, error);
    throw error;
  }
};

// Delete a document
const deleteDocument = async (collectionName, docId) => {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    
    await docRef.delete();
    return { id: docId, deleted: true };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

// Execute a batch write operation
const executeBatch = async (operations) => {
  try {
    const batch = db.batch();
    
    operations.forEach(op => {
      const { type, collection, docId, data } = op;
      const docRef = docId 
        ? db.collection(collection).doc(docId)
        : db.collection(collection).doc();
      
      switch (type) {
        case 'set':
          batch.set(docRef, data);
          break;
        case 'update':
          batch.update(docRef, data);
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error executing batch operation:', error);
    throw error;
  }
};

// Execute a transaction
const executeTransaction = async (transactionFn) => {
  try {
    return await db.runTransaction(transactionFn);
  } catch (error) {
    console.error('Error executing transaction:', error);
    throw error;
  }
};

module.exports = {
  documentToObject,
  documentsToArray,
  createDocument,
  updateDocument,
  getDocumentById,
  queryDocuments,
  deleteDocument,
  executeBatch,
  executeTransaction
};