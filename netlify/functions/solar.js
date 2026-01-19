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

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body);
    const { action, user, pass, token, plantId } = payload;

    // 🔴 CHECK YOUR DOCS: Is the Base URL 'https://openapi.growatt.com/'?
    const BASE_URL = "https://openapi.growatt.com"; 

    try {
        // --- SCENARIO 1: LOGIN (GET TOKEN) ---
        // If your docs say you have a "Fixed Token", you can skip this and just hardcode it.
        // If your docs have a "Get Token" endpoint (like /v1/token), use this:
        if (action === 'login') {
            // 🔴 CHECK YOUR DOCS: What is the specific endpoint to get a token?
            // It might be "/v1/token" or similar.
            const response = await fetch(`${BASE_URL}/v1/token?pass=${pass}&user=${user}`, {
                method: 'GET' // or POST, check your docs
            });
            
            const data = await response.json();

            // Growatt usually returns { result: 1, data: ... } or { code: 0, data: ... }
            if (data.result === 1 || data.code === 0) { 
                return {
                    statusCode: 200,
                    body: JSON.stringify({ 
                        success: true, 
                        // The token might be inside data.data or data.token
                        token: data.data.token || data.data 
                    })
                };
            } else {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ success: false, message: "Login failed" })
                };
            }
        }

        // --- SCENARIO 2: GET PLANT DATA ---
        if (action === 'getData') {
            if (!token) return { statusCode: 401, body: "No token provided" };

            // 🔴 CHECK YOUR DOCS: Find the "Plant Details" or "Plant List" endpoint.
            // It is likely "/v1/plant/list" or "/v1/plant/details"
            const endpoint = `/v1/plant/list`; // Update this path based on your API sequence
            
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'GET', // Open APIs usually use GET for data
                headers: { 
                    'token': token // The Standard OpenAPI header
                }
            });
            
            const data = await response.json();
            
            // Log the raw data to Netlify logs (visible in dashboard) to help debug
            console.log("Growatt Response:", JSON.stringify(data));

            if (data.result === 1 || data.code === 0) {
                // We need to find the specific numbers in the response structure
                // Adjust these paths (e.g. data.data[0].pac) based on what you see in the logs
                const plant = data.data && data.data[0] ? data.data[0] : {};
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        power: plant.pac || plant.power || 0,     // Current Power
                        today: plant.e_today || plant.today || 0  // Daily Energy
                    })
                };
            } else {
                 return {
                    statusCode: 500,
                    body: JSON.stringify({ success: false, message: "API Error" })
                };
            }
        }

        return { statusCode: 400, body: "Unknown action" };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};