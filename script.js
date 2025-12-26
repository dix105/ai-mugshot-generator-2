document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.textContent = nav.classList.contains('active') ? '✕' : '☰';
        });
        
        // Close menu when clicking a link
        document.querySelectorAll('header nav a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.textContent = '☰';
            });
        });
    }

    // --- ACCORDION LOGIC ---
    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(acc => {
        acc.addEventListener('click', () => {
            acc.classList.toggle('active');
            const panel = acc.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    });

    // --- MODAL LOGIC ---
    const modalButtons = document.querySelectorAll('[data-modal-target]');
    const closeButtons = document.querySelectorAll('[data-modal-close]');
    
    function openModal(modalId) {
        const modal = document.getElementById(modalId + '-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId + '-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    modalButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-modal-target');
            openModal(target);
        });
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-modal-close');
            closeModal(target);
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    // --- INTERSECTION OBSERVER ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .box, .panel').forEach(el => {
        el.style.opacity = '0';
        el.style.animationFillMode = 'forwards';
        observer.observe(el);
    });

    // =========================================================================
    // BACKEND WIRING - REAL API INTEGRATION
    // =========================================================================

    // DOM Elements
    const dropZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const uploadContent = document.querySelector('.upload-content');
    const removeBtn = document.getElementById('remove-btn');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const loadingState = document.getElementById('loading-state');
    const resultImage = document.getElementById('result-final');
    const placeholderContent = document.querySelector('.placeholder-content');
    const downloadBtn = document.getElementById('download-btn');
    const resultArea = document.querySelector('.result-area'); // Helper for video injection

    // Global State
    let currentUploadedUrl = null;
    const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
    const POLL_INTERVAL = 2000;
    const MAX_POLLS = 60;

    // --- UTILITY FUNCTIONS ---

    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function updateStatus(message) {
        // Reuse the generate button or loading state text to show status
        if (generateBtn && generateBtn.disabled) {
            generateBtn.textContent = message;
        }
        const loadingText = loadingState.querySelector('p');
        if (loadingText && !loadingState.classList.contains('hidden')) {
            loadingText.textContent = message;
        }
    }

    function showLoading() {
        loadingState.classList.remove('hidden');
        if (placeholderContent) placeholderContent.classList.add('hidden');
        if (resultImage) resultImage.classList.add('hidden');
        const video = document.getElementById('result-video');
        if (video) video.style.display = 'none';
        
        if (generateBtn) {
            generateBtn.disabled = true;
        }
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
        if (generateBtn) {
            generateBtn.textContent = 'GENERATE MUGSHOT';
            generateBtn.disabled = false; // Note: Only re-enable if logic permits
        }
    }

    function showError(message) {
        console.error(message);
        alert(message); // Simple error handling for this context
        hideLoading();
    }

    function enableGenerateButton() {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'GENERATE MUGSHOT';
        }
    }

    // --- API FUNCTIONS ---

    // Upload file to CDN storage
    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        const fileName = 'media/' + uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL
        const signedUrlResponse = await fetch(
            'https://core.faceswapper.ai/media/get-upload-url?fileName=' + encodeURIComponent(fileName) + '&projectId=dressr',
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        
        // Step 2: PUT file to signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        const downloadUrl = 'https://assets.dressr.ai/' + fileName;
        return downloadUrl;
    }

    // Submit generation job
    async function submitImageGenJob(imageUrl) {
        const endpoint = 'https://api.chromastudio.ai/image-gen';
        
        const body = {
            model: 'image-effects',
            toolType: 'image-effects',
            effectId: 'mugshot',
            imageUrl: imageUrl,
            userId: USER_ID,
            removeWatermark: true,
            isPrivate: true
        };
    
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        return data;
    }

    // Poll job status
    async function pollJobStatus(jobId) {
        const baseUrl = 'https://api.chromastudio.ai/image-gen';
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${USER_ID}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            
            if (data.status === 'completed') {
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
    }

    // --- UI HANDLERS ---

    // Show upload preview
    function showPreview(url) {
        previewImage.src = url;
        previewImage.classList.remove('hidden');
        uploadContent.classList.add('hidden');
        removeBtn.classList.remove('hidden');
    }

    // Show final result
    function showResultMedia(url) {
        // Handle Video vs Image
        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        if (resultImage) resultImage.classList.add('hidden');
        const existingVideo = document.getElementById('result-video');
        if (existingVideo) existingVideo.style.display = 'none';

        if (isVideo) {
            let video = document.getElementById('result-video');
            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = resultImage.className;
                // Insert video where image is
                resultImage.parentElement.appendChild(video);
            }
            video.src = url;
            video.style.display = 'block';
        } else {
            if (resultImage) {
                resultImage.crossOrigin = 'anonymous'; // Critical for canvas download
                resultImage.src = url;
                resultImage.classList.remove('hidden');
            }
        }
        
        if (placeholderContent) placeholderContent.classList.add('hidden');
        if (downloadBtn) {
            downloadBtn.dataset.url = url;
            downloadBtn.disabled = false;
        }
    }

    // Handle File Selection
    async function handleFileSelect(file) {
        if (!file) return;
        
        try {
            // UI: Show loading locally immediately
            uploadContent.classList.add('hidden');
            // Show a local preview while uploading to feel responsive
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
            };
            reader.readAsDataURL(file);

            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'UPLOADING...';
            }
            
            // Start Upload
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            removeBtn.classList.remove('hidden');
            enableGenerateButton();
            
        } catch (error) {
            resetUpload();
            showError('Upload failed: ' + error.message);
        }
    }

    // Handle Generate Click
    async function handleGenerate() {
        if (!currentUploadedUrl) {
            alert('Please upload an image first.');
            return;
        }
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // 1. Submit
            const jobData = await submitImageGenJob(currentUploadedUrl);
            updateStatus('JOB QUEUED...');
            
            // 2. Poll
            const result = await pollJobStatus(jobData.jobId);
            
            // 3. Extract URL
            // Schema checks for various API versions
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                throw new Error('No result URL found in response');
            }
            
            // 4. Show Result
            showResultMedia(resultUrl);
            hideLoading();
            updateStatus('COMPLETE'); // Temporarily show complete on button
            setTimeout(() => {
                if(generateBtn) generateBtn.textContent = 'GENERATE MUGSHOT';
            }, 2000);
            
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    }

    // Reset Logic
    function resetUpload() {
        currentUploadedUrl = null;
        fileInput.value = '';
        previewImage.classList.add('hidden');
        previewImage.src = '';
        uploadContent.classList.remove('hidden');
        removeBtn.classList.add('hidden');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'GENERATE MUGSHOT';
        }
    }

    function resetResult() {
        if (resultImage) {
            resultImage.classList.add('hidden');
            resultImage.src = '';
        }
        const video = document.getElementById('result-video');
        if (video) video.style.display = 'none';
        
        if (placeholderContent) placeholderContent.classList.remove('hidden');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.dataset.url = '';
        }
        if (loadingState) loadingState.classList.add('hidden');
    }

    // --- EVENT LISTENERS WIRING ---

    // File Input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                resetResult(); // Clear previous results if any
                handleFileSelect(file);
            }
        });
    }

    // Drag & Drop
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent)';
            dropZone.style.background = 'rgba(214, 160, 104, 0.1)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            dropZone.style.background = '';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            dropZone.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file) {
                resetResult();
                handleFileSelect(file);
            }
        });

        // Click to open file dialog
        dropZone.addEventListener('click', () => fileInput.click());
    }

    // Generate Button
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // Remove Button
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUpload();
            resetResult();
        });
    }

    // Reset Button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetUpload();
            resetResult();
        });
    }

    // Download Button - Robust Implementation
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;
            
            try {
                // Method 1: Fetch Blob (Best quality, needs CORS support)
                const response = await fetch(url, {
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) throw new Error('Network response was not ok');
                
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                // Guess extension
                const contentType = response.headers.get('content-type') || '';
                let ext = 'jpg';
                if (contentType.includes('video') || url.match(/\.mp4/i)) ext = 'mp4';
                else if (contentType.includes('png')) ext = 'png';
                
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `mugshot_${generateNanoId(8)}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                
            } catch (err) {
                console.warn('Fetch download failed, trying canvas fallback:', err);
                
                // Method 2: Canvas Fallback (For images only)
                try {
                    const img = document.getElementById('result-final');
                    if (img && !img.classList.contains('hidden') && img.src) {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `mugshot_${generateNanoId(8)}.png`;
                                link.click();
                                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                            } else {
                                throw new Error('Canvas blob creation failed');
                            }
                        }, 'image/png');
                    } else {
                        throw new Error('Not an image or image not loaded');
                    }
                } catch (canvasErr) {
                    console.error('Canvas download failed:', canvasErr);
                    // Method 3: Last Resort - Open in new tab
                    alert('Direct download not supported. Opening in new tab. Please right-click and "Save As".');
                    window.open(url, '_blank');
                }
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }
        });
    }
});