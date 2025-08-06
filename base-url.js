// Base URL handling for GitHub Pages

// Function to get the base URL for the current environment
function getBaseUrl() {
  // Check if we're running on GitHub Pages
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  // If on GitHub Pages, get the repository name from the pathname
  if (isGitHubPages) {
    // Extract the repository name from the pathname
    const pathSegments = window.location.pathname.split('/');
    if (pathSegments.length > 1) {
      // Return the repository path as the base URL
      return '/' + pathSegments[1] + '/';
    }
  }
  
  // If not on GitHub Pages or no repository name found, return root
  return '/';
}

// Export the base URL
export const baseUrl = getBaseUrl();