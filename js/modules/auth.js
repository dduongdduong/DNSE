export function checkOnboardingStatus() {
    const profileData = localStorage.getItem('dnse_user');
    
    if (!profileData) {
        window.location.replace('onboarding.html');
        return null;
    }
    
    return JSON.parse(profileData);
}
export function handleLogout() {
    localStorage.removeItem('dnse_user');
    window.location.replace('onboarding.html');
}