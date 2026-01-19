exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body);
    const { action, user, pass, token } = payload;
    
    // REPLACE THIS with your actual Growatt API Base URL
    const BASE_URL = "https://server-api.growatt.com"; 

    try {
        // --- SCENARIO 1: LOGIN ---
        if (action === 'login') {
            // Customize this fetch based on your specific Growatt API Login Sequence
            // Some APIs require hashing the password (MD5) before sending.
            
            const params = new URLSearchParams();
            params.append('username', user);
            params.append('password', pass); // Check docs: do you need to MD5 hash this?

            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                body: params
            });
            
            const data = await response.json();

            // Mock validation - Replace with actual check from Growatt response
            if (data.result === 1 || data.success === true) { 
                return {
                    statusCode: 200,
                    body: JSON.stringify({ 
                        success: true, 
                        token: data.token || "mock-token-123" // Return the API token
                    })
                };
            } else {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ success: false, message: "Invalid credentials" })
                };
            }
        }

        // --- SCENARIO 2: GET DATA ---
        if (action === 'getData') {
            if (!token) return { statusCode: 401, body: "No token provided" };

            // Fetch plant data using the token
            const response = await fetch(`${BASE_URL}/v1/plant/data`, {
                headers: { 'token': token }
            });
            
            const data = await response.json();

            // Transform Growatt data to simple JSON for frontend
            // Adjust 'data.data.pac' etc based on actual API response structure
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    power: data.data?.pac || 0,       // Current Power (W or kW)
                    today: data.data?.e_today || 0    // Energy Today
                })
            };
        }

        return { statusCode: 400, body: "Unknown action" };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};