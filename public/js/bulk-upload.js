// /js/bulk-upload.js

checkUploaderAccess(); // assuming your auth guard

const fileInput = document.getElementById('file-input');
const selectFilesBtn = document.getElementById('select-files-btn');
const uploadBtn = document.getElementById('upload-btn');
const filePreviewGrid = document.getElementById('file-preview-grid');
const uploadStatus = document.getElementById('upload-status');

let selectedFiles = [];

// Handle file selection
selectFilesBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);

  if (selectedFiles.length > 50) {
    alert('You can only upload up to 50 photos at a time.');
    resetUploadUI();
    return;
  }

  const oversizedFiles = selectedFiles.filter(file => file.size > 1 * 1024 * 1024);
  if (oversizedFiles.length > 0) {
    alert('Each file must be less than 1MB.');
    resetUploadUI();
    return;
  }

  console.log(`Selected ${selectedFiles.length} valid files.`);

  filePreviewGrid.innerHTML = '';
  selectedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'preview-thumbnail';
      filePreviewGrid.appendChild(img);
    }
    reader.readAsDataURL(file);
  });

  uploadBtn.disabled = false;
});

// Upload handler
uploadBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    alert('No files selected.');
    return;
  }

  uploadBtn.disabled = true;
  uploadStatus.innerHTML = 'Uploading...';

  const storage = firebase.storage();
  const firestore = firebase.firestore();
  const auth = firebase.auth();

  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to upload.');
    uploadStatus.innerHTML = 'Upload failed. Not authenticated.';
    uploadBtn.disabled = false;
    return;
  }

  let successCount = 0;

  // Upload all files in parallel
  const uploadPromises = selectedFiles.map(async (file) => {
    try {
      const uniqueName = `${Date.now()}_${file.name}`;
      const storageRef = storage.ref(`uploads/${uniqueName}`);
      const snapshot = await storageRef.put(file);

      const downloadURL = await snapshot.ref.getDownloadURL();

      await firestore.collection('photos').add({
        title: file.name.split('.')[0],
        url: downloadURL,
        uploadedBy: user.displayName || user.email || 'Unknown',
        uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
      });

      successCount++;
    } catch (error) {
      console.error('Error uploading file:', file.name, error);
    }
  });

  await Promise.all(uploadPromises);

  uploadStatus.innerHTML = `✅ Upload complete. ${successCount}/${selectedFiles.length} photos uploaded successfully.`;

  resetUploadUI();
});

// Reset the upload UI after upload or error
function resetUploadUI() {
  fileInput.value = '';
  filePreviewGrid.innerHTML = '';
  selectedFiles = [];
  uploadBtn.disabled = true;
}