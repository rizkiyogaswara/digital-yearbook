// /js/bulk-upload.js

checkUploaderAccess(); // Auth guard

const fileInput = document.getElementById('file-input');
const selectFilesBtn = document.getElementById('select-files-btn');
const uploadBtn = document.getElementById('upload-btn');
const filePreviewGrid = document.getElementById('file-preview-grid');
const uploadStatus = document.getElementById('upload-status');
const albumSelect = document.getElementById('album-select');

let selectedFiles = [];

// Load albums dynamically
async function loadAlbums() {
  try {
    const response = await fetch('/api/albums');
    const albums = await response.json();

    albums.forEach(album => {
      const option = document.createElement('option');
      option.value = album._id || album.id || album.name; // Match your API
      option.textContent = album.name || album.title || album.albumName;
      albumSelect.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading albums:', error);
    alert('Failed to load albums.');
  }
}

// Load albums immediately
loadAlbums();

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
    };
    reader.readAsDataURL(file);
  });

  uploadBtn.disabled = false;
});

// Upload handler
uploadBtn.addEventListener('click', async () => {
  const selectedAlbumId = albumSelect.value;

  if (!selectedAlbumId) {
    alert('Please select an album before uploading.');
    return;
  }

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

  // 🔥 NEW: Get a reference to the album document
  const albumRef = firestore.collection('albums').doc(selectedAlbumId);

  const uploadPromises = selectedFiles.map(async (file) => {
    try {
      const uniqueName = `${Date.now()}_${file.name}`;
      const storageRef = storage.ref(`uploads/${selectedAlbumId}/${uniqueName}`);
      const snapshot = await storageRef.put(file);

      // const downloadURL = await snapshot.ref.getDownloadURL();
      const relativePath = `uploads/${selectedAlbumId}/${uniqueName}`;

      await firestore.collection('photos').add({
        albumId: selectedAlbumId,
        description: null,
        featured: {
          isFeatured: false,
          wasFeatured: false
          // 🔥 no featuredDate at all
        },
        likes: 0,
        title: null,
        // url: downloadURL,
        url: relativePath, // ✅ SAVE RELATIVE PATH, not downloadURL
        uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
        uploadedBy: user.displayName || user.email || 'Unknown',
      });

      // 🔥 NEW: Set coverPhoto if not already set
      const albumDoc = await albumRef.get();
      const albumData = albumDoc.data();
      if (!albumData.coverPhoto) {
        await albumRef.update({
          coverPhoto: relativePath // ✅ not downloadURL
        });
        console.log(`✅ Cover photo set for album ${selectedAlbumId} using relative path: ${relativePath}`);
      }

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

document.getElementById("save-album-btn").addEventListener("click", async () => {
  const name = document.getElementById("album-name").value.trim();
  const description = document.getElementById("album-description").value.trim();
  const nameError = document.getElementById("album-name-error");

  if (!name) {
    nameError.textContent = "Album name is required.";
    return;
  } else {
    nameError.textContent = "";
  }

  let createdBy = 'User';
  const user = firebase.auth().currentUser;
  if (user && user.displayName) {
    createdBy = user.displayName;
  }

  try {
    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, createdBy }),
    });

    const result = await response.json();

    if (response.ok) {
      alert("✅ Album created successfully!");
      document.getElementById("album-name").value = "";
      document.getElementById("album-description").value = "";

      // Optional: refresh the album dropdown if loadAlbums exists
      if (typeof loadAlbums === "function") {
        loadAlbums();
      }
    } else {
      alert("⚠️ Failed to create album: " + (result.message || "Unknown error"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ An error occurred while creating the album.");
  }
});