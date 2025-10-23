// Main script to load and display gospel presentation content
document.addEventListener('DOMContentLoaded', function() {
    // Check if gospelPresentationData is available
    if (typeof gospelPresentationData === 'undefined') {
        console.error('Gospel presentation data not found!');
        return;
    }

    generateTableOfContents();
    generateContent();
    setupModal();
});

function generateTableOfContents() {
    const tocList = document.getElementById('toc-list');
    
    gospelPresentationData.forEach(section => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        
        link.href = `#section-${section.section}`;
        link.textContent = `${section.section}. ${section.title}`;
        
        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });
}

function generateContent() {
    const contentContainer = document.getElementById('gospel-content');
    
    gospelPresentationData.forEach(section => {
        const sectionElement = createSectionElement(section);
        contentContainer.appendChild(sectionElement);
    });
}

function createSectionElement(section) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'gospel-section';
    sectionDiv.id = `section-${section.section}`;
    
    // Create section title
    const titleElement = document.createElement('h2');
    titleElement.className = 'section-title';
    titleElement.innerHTML = `<span class="section-number">${section.section}.</span>${section.title}`;
    sectionDiv.appendChild(titleElement);
    
    // Add main scriptures if they exist
    if (section.mainScriptures && section.mainScriptures.length > 0) {
        const mainScripturesDiv = createScripturesElement(section.mainScriptures, 'Main References');
        sectionDiv.appendChild(mainScripturesDiv);
    }
    
    // Create subsections
    if (section.subsections) {
        section.subsections.forEach(subsection => {
            const subsectionElement = createSubsectionElement(subsection);
            sectionDiv.appendChild(subsectionElement);
        });
    }
    
    return sectionDiv;
}

function createSubsectionElement(subsection, isNested = false) {
    const subsectionDiv = document.createElement('div');
    subsectionDiv.className = isNested ? 'nested-subsection' : 'subsection';
    
    // Create subsection header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'subsection-header';
    
    const identifier = subsection.letter || subsection.number;
    const identifierClass = subsection.letter ? 'subsection-letter' : 'nested-number';
    
    headerDiv.innerHTML = `<span class="${identifierClass}">${identifier}.</span>${subsection.text}`;
    subsectionDiv.appendChild(headerDiv);
    
    // Add subsection content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'subsection-text';
    
    // Add long text if it exists
    if (subsection.longText) {
        const longTextDiv = document.createElement('div');
        longTextDiv.className = 'long-text';
        longTextDiv.textContent = subsection.longText;
        contentDiv.appendChild(longTextDiv);
    }
    
    // Add scriptures
    if (subsection.scriptures && subsection.scriptures.length > 0) {
        const scripturesDiv = createScripturesElement(subsection.scriptures);
        contentDiv.appendChild(scripturesDiv);
    }
    
    // Add wrong ways list (for section VIII.A)
    if (subsection.wrongWays) {
        const wrongWaysDiv = createWrongWaysElement(subsection.wrongWays);
        contentDiv.appendChild(wrongWaysDiv);
    }
    
    // Add living for areas (for section VIII.B.2.c)
    if (subsection.livingFor) {
        const livingForDiv = createLivingForElement(subsection.livingFor);
        contentDiv.appendChild(livingForDiv);
    }
    
    // Handle nested subsections
    if (subsection.subsections) {
        subsection.subsections.forEach(nestedSubsection => {
            const nestedElement = createSubsectionElement(nestedSubsection, true);
            contentDiv.appendChild(nestedElement);
        });
    }
    
    subsectionDiv.appendChild(contentDiv);
    return subsectionDiv;
}

function createScripturesElement(scriptures, label = 'Scripture References') {
    const scripturesDiv = document.createElement('div');
    scripturesDiv.className = 'scriptures';
    
    const labelElement = document.createElement('span');
    labelElement.className = 'scripture-label';
    labelElement.textContent = `${label}:`;
    scripturesDiv.appendChild(labelElement);
    
    const refsContainer = document.createElement('div');
    refsContainer.className = 'scripture-refs';
    
    scriptures.forEach(scripture => {
        const refSpan = document.createElement('span');
        refSpan.className = 'scripture-ref';
        refSpan.textContent = scripture;
        refSpan.addEventListener('click', () => showScripture(scripture));
        refSpan.style.cursor = 'pointer';
        refSpan.title = `Click to read ${scripture}`;
        refsContainer.appendChild(refSpan);
    });
    
    scripturesDiv.appendChild(refsContainer);
    return scripturesDiv;
}

function createWrongWaysElement(wrongWays) {
    const wrongWaysDiv = document.createElement('div');
    wrongWaysDiv.className = 'wrong-ways';
    
    const titleElement = document.createElement('h4');
    titleElement.textContent = 'Wrong Ways to Come to Christ:';
    wrongWaysDiv.appendChild(titleElement);
    
    const listElement = document.createElement('ul');
    
    wrongWays.forEach(wrongWay => {
        const listItem = document.createElement('li');
        listItem.textContent = wrongWay;
        listElement.appendChild(listItem);
    });
    
    wrongWaysDiv.appendChild(listElement);
    return wrongWaysDiv;
}

function createLivingForElement(livingForAreas) {
    const livingForDiv = document.createElement('div');
    livingForDiv.className = 'living-for';
    
    const titleElement = document.createElement('h4');
    titleElement.textContent = 'Areas of Life to Live for Christ:';
    livingForDiv.appendChild(titleElement);
    
    const areasContainer = document.createElement('div');
    areasContainer.className = 'living-areas';
    
    livingForAreas.forEach(area => {
        const areaDiv = document.createElement('div');
        areaDiv.className = 'living-area';
        
        const areaName = document.createElement('div');
        areaName.className = 'area-name';
        areaName.textContent = area.area;
        areaDiv.appendChild(areaName);
        
        if (area.scriptures && area.scriptures.length > 0) {
            const scripturesDiv = createScripturesElement(area.scriptures, 'References');
            areaDiv.appendChild(scripturesDiv);
        }
        
        areasContainer.appendChild(areaDiv);
    });
    
    livingForDiv.appendChild(areasContainer);
    return livingForDiv;
}

// Smooth scrolling for navigation links
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && e.target.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});

// Add keyboard navigation for accessibility
document.addEventListener('keydown', function(e) {
    // Press 'T' to focus on table of contents
    if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const tocList = document.getElementById('toc-list');
        if (tocList) {
            const firstLink = tocList.querySelector('a');
            if (firstLink) {
                firstLink.focus();
            }
        }
    }
});

// Add print functionality
function printPage() {
    window.print();
}

// Add search functionality (basic)
function searchContent(searchTerm) {
    if (!searchTerm || searchTerm.length < 3) {
        clearSearchHighlights();
        return;
    }
    
    clearSearchHighlights();
    
    const contentContainer = document.getElementById('gospel-content');
    const walker = document.createTreeWalker(
        contentContainer,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    const searchRegex = new RegExp(searchTerm, 'gi');
    
    while (node = walker.nextNode()) {
        if (searchRegex.test(node.textContent)) {
            const parent = node.parentElement;
            const highlightedText = node.textContent.replace(searchRegex, `<mark>$&</mark>`);
            parent.innerHTML = parent.innerHTML.replace(node.textContent, highlightedText);
        }
    }
}

function clearSearchHighlights() {
    const marks = document.querySelectorAll('mark');
    marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });
}

// ESV API Integration
async function fetchScripture(reference) {
    // Check if config is loaded
    if (typeof CONFIG === 'undefined') {
        throw new Error('Configuration not loaded. Please ensure config.js is included.');
    }

    // Check if API key is configured
    if (!CONFIG.ESV_API_TOKEN || CONFIG.ESV_API_TOKEN === 'your_api_key_here') {
        throw new Error('ESV API key not configured. Please add your API key to config.js');
    }

    try {
        // Clean up the reference for API call
        const cleanRef = reference.replace(/[–—]/g, '-').trim();
        
        const params = new URLSearchParams({
            q: cleanRef,
            'include-headings': false,
            'include-footnotes': false,
            'include-verse-numbers': true,
            'include-short-copyright': false,
            'include-passage-references': false,
            'include-audio-link': false,
            'audio-format': 'mp3'
        });

        // Construct URL with optional CORS proxy
        const apiUrl = CONFIG.USE_CORS_PROXY 
            ? `${CONFIG.CORS_PROXY_URL}${CONFIG.ESV_API_URL}` 
            : CONFIG.ESV_API_URL;

        // Debug logging (reduced for normal use)
        const isDebugMode = !CONFIG.IS_PRODUCTION && localStorage.getItem('gospelDebug') === 'true';
        
        if (isDebugMode) {
            console.group(`🔍 Fetching Scripture: ${cleanRef}`);
            console.log('📖 Clean reference:', cleanRef);
            console.log('🔗 API URL:', `${apiUrl}?${params}`);
            console.log('🔑 API Token length:', CONFIG.ESV_API_TOKEN?.length || 'undefined');
            console.log('🏗️ Build info:', {
                buildTime: CONFIG.BUILD_TIME,
                environment: CONFIG.IS_PRODUCTION ? 'production' : 'development',
                source: CONFIG.BUILD_SOURCE
            });
        } else {
            console.log(`📖 Fetching ${cleanRef}...`);
        }

        const headers = {
            'Authorization': `Token ${CONFIG.ESV_API_TOKEN}`,
        };

        if (isDebugMode) {
            console.log('📤 Request headers:', headers);
        }

        const response = await fetch(`${apiUrl}?${params}`, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        // Log response text for debugging (before parsing as JSON)
        const responseText = await response.text();
        
        if (isDebugMode) {
            console.log('📥 Response status:', response.status);
            console.log('📥 Response OK:', response.ok);
            console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
            console.log('📄 Response text length:', responseText.length);
            console.log('📄 Response preview:', responseText.substring(0, 200) + '...');
        }

        if (!response.ok) {
            console.error('❌ Response not OK:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                responseText: responseText.substring(0, 500)
            });
            
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your ESV API token in config.js');
            } else if (response.status === 403) {
                throw new Error('API access denied. Please check your ESV API permissions.');
            } else if (response.status === 429) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            } else if (response.status === 400) {
                throw new Error(`Bad request - invalid scripture reference: "${reference}"`);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText || 'API request failed'}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
            if (isDebugMode) {
                console.log('✅ Parsed JSON data:', data);
            }
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            if (isDebugMode) {
                console.log('Raw response:', responseText);
            }
            throw new Error('Invalid JSON response from ESV API');
        }
        
        if (isDebugMode) {
            console.groupEnd();
        }
        
        if (data.passages && data.passages.length > 0) {
            return {
                text: data.passages[0],
                canonical: data.canonical || reference
            };
        } else {
            throw new Error('No passages found for this reference');
        }
    } catch (error) {
        console.error('Error fetching scripture:', error);
        
        // Provide more specific error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('CORS')) {
            throw new Error('CORS error. You may need to enable CORS proxy in config.js for local development.');
        }
        
        throw error;
    }
}

function showScripture(reference) {
    const modal = document.getElementById('scripture-modal');
    const modalTitle = document.getElementById('modal-title');
    const scriptureText = document.getElementById('scripture-text');
    const loadingDiv = document.getElementById('scripture-loading');
    const errorDiv = document.getElementById('scripture-error');

    // Show modal and loading state
    modal.style.display = 'block';
    modalTitle.textContent = reference;
    scriptureText.style.display = 'none';
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'flex';

    // Fetch scripture
    fetchScripture(reference)
        .then(data => {
            loadingDiv.style.display = 'none';
            scriptureText.style.display = 'block';
            
            // Format the scripture text
            let formattedText = data.text
                .replace(/\[(\d+)\]/g, '<span class="verse-number">$1</span>')
                .replace(/\n\s*\n/g, '</p><p>')
                .trim();
            
            if (!formattedText.startsWith('<p>')) {
                formattedText = '<p>' + formattedText;
            }
            if (!formattedText.endsWith('</p>')) {
                formattedText = formattedText + '</p>';
            }
            
            scriptureText.innerHTML = formattedText;
            modalTitle.textContent = data.canonical || reference;
        })
        .catch(error => {
            console.error('Failed to fetch scripture:', error);
            loadingDiv.style.display = 'none';
            errorDiv.style.display = 'block';
            scriptureText.style.display = 'none';
            
            // Clear any previous error details
            errorDiv.querySelectorAll('.error-details, .setup-help, .debug-info').forEach(el => el.remove());
            
            // Update error message with specific error
            const errorText = errorDiv.querySelector('p');
            errorText.textContent = error.message || 'Unable to load scripture. Please try again later.';
            
            // Add debug information
            const debugInfo = document.createElement('div');
            debugInfo.className = 'debug-info';
            debugInfo.innerHTML = `
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #666;">Debug Information</summary>
                    <div style="margin-top: 5px; font-size: 0.8rem; color: #666;">
                        <p><strong>Reference:</strong> ${reference}</p>
                        <p><strong>API Token:</strong> ${CONFIG.ESV_API_TOKEN ? 'Configured (length: ' + CONFIG.ESV_API_TOKEN.length + ')' : 'Not configured'}</p>
                        <p><strong>Environment:</strong> ${CONFIG.IS_PRODUCTION ? 'Production' : 'Development'}</p>
                        <p><strong>Build Source:</strong> ${CONFIG.BUILD_SOURCE || 'Unknown'}</p>
                        <p><strong>CORS Proxy:</strong> ${CONFIG.USE_CORS_PROXY ? 'Enabled' : 'Disabled'}</p>
                        <p><strong>Error:</strong> ${error.message}</p>
                    </div>
                </details>
            `;
            errorDiv.appendChild(debugInfo);
            
            // Add configuration help for common errors
            if (error.message.includes('API key not configured')) {
                const helpText = document.createElement('div');
                helpText.className = 'setup-help';
                helpText.innerHTML = `
                    <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 0.9rem;">
                        <p><strong>Setup Instructions:</strong></p>
                        <ol style="text-align: left; margin: 10px 0;">
                            <li>Go to <a href="https://api.esv.org/account/create-application/" target="_blank">api.esv.org</a></li>
                            <li>Create a free account and application</li>
                            <li>Copy your API token</li>
                            <li>Edit .env file: ESV_API_TOKEN=your_token_here</li>
                            <li>Run: node build-config.js</li>
                            <li>Refresh this page</li>
                        </ol>
                    </div>
                `;
                errorDiv.appendChild(helpText);
            } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
                const networkHelp = document.createElement('div');
                networkHelp.className = 'setup-help';
                networkHelp.innerHTML = `
                    <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px; font-size: 0.9rem;">
                        <p><strong>Network Issue:</strong></p>
                        <ul style="text-align: left; margin: 10px 0;">
                            <li>Check your internet connection</li>
                            <li>Try refreshing the page</li>
                            <li>If using local development, try enabling CORS proxy in .env file</li>
                        </ul>
                    </div>
                `;
                errorDiv.appendChild(networkHelp);
            } else if (error.message.includes('CORS')) {
                const corsHelp = document.createElement('div');
                corsHelp.className = 'setup-help';
                corsHelp.innerHTML = `
                    <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px; font-size: 0.9rem;">
                        <p><strong>CORS Issue (Local Development):</strong></p>
                        <ol style="text-align: left; margin: 10px 0;">
                            <li>Edit .env file: USE_CORS_PROXY=true</li>
                            <li>Run: node build-config.js</li>
                            <li>Refresh this page</li>
                            <li>Or deploy to Netlify (no CORS issues in production)</li>
                        </ol>
                    </div>
                `;
                errorDiv.appendChild(corsHelp);
            }
            
            // Add retry button
            if (!errorDiv.querySelector('.retry-btn')) {
                const retryBtn = document.createElement('button');
                retryBtn.className = 'retry-btn';
                retryBtn.textContent = 'Try Again';
                retryBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;';
                retryBtn.onclick = () => {
                    // Clear previous error content
                    errorDiv.querySelectorAll('.setup-help').forEach(el => el.remove());
                    showScripture(reference);
                };
                errorDiv.appendChild(retryBtn);
            }
        });
}

function setupModal() {
    const modal = document.getElementById('scripture-modal');
    const closeBtn = modal.querySelector('.close');

    // Close modal when clicking the X
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };

    // Close modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

// Test API connection
async function testApiConnection() {
    console.group('🧪 Testing ESV API Connection');
    
    try {
        // Test with a simple, well-known reference
        const testRef = 'John 3:16';
        console.log('Testing with reference:', testRef);
        
        const result = await fetchScripture(testRef);
        console.log('✅ API test successful!', result);
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ API test failed:', error);
        return { success: false, error: error.message };
    } finally {
        console.groupEnd();
    }
}

// Update API status display
function updateApiStatus(success, message) {
    const statusElement = document.getElementById('api-status');
    const testBtn = document.getElementById('test-api-btn');
    
    if (statusElement) {
        if (success) {
            statusElement.innerHTML = '<span style="color: #27ae60;">✅ Ready</span>';
            // Hide test button when working
            if (testBtn) testBtn.style.display = 'none';
        } else {
            statusElement.innerHTML = `<span style="color: #e74c3c;">❌ ${message || 'Failed'}</span>`;
            // Show test button when there's an issue
            if (testBtn) testBtn.style.display = 'inline';
        }
    }
}

// Setup test button
function setupApiTest() {
    const testBtn = document.getElementById('test-api-btn');
    if (testBtn) {
        testBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = 'Testing...';
            
            const result = await testApiConnection();
            
            if (result.success) {
                updateApiStatus(true);
                this.textContent = '✅ API Working';
                this.style.background = '#27ae60';
            } else {
                updateApiStatus(false, result.error);
                this.textContent = 'Test Failed - Retry';
                this.style.background = '#e74c3c';
                this.disabled = false;
            }
        });
    }
}

// Auto-test API on page load
document.addEventListener('DOMContentLoaded', function() {
    setupApiTest();
    
    // Wait a bit for everything to load, then test
    setTimeout(async () => {
        console.log('🚀 Auto-testing ESV API connection...');
        const result = await testApiConnection();
        updateApiStatus(result.success, result.error);
        
        if (result.success) {
            console.log('✅ ESV API is working correctly!');
        } else {
            console.warn('⚠️ ESV API test failed. Scripture references may not work.');
        }
    }, 1000);
});

// Enable/disable debug mode
function enableDebugMode() {
    localStorage.setItem('gospelDebug', 'true');
    console.log('🔧 Debug mode enabled. Reload page for verbose logging.');
}

function disableDebugMode() {
    localStorage.setItem('gospelDebug', 'false');
    console.log('📴 Debug mode disabled. Reload page for normal logging.');
}

// Export functions for potential external use
window.gospelPresentation = {
    searchContent,
    clearSearchHighlights,
    printPage,
    showScripture,
    fetchScripture,
    testApiConnection,
    enableDebugMode,
    disableDebugMode
};