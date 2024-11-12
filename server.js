import express, { query } from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import crypto from "crypto";
import session from "express-session";
import pg from "pg";
import multer from 'multer';

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "staymates",  // Update to match your new database name
    password: "kcb@2004",
    port: 5432,
});

db.connect();



let is_verified = false;
// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// Middleware to parse URL-encoded bodies (from forms)
app.use(express.urlencoded({ extended: true }));

// Set up sessions
app.use(session({
    secret: 'your-secret-key',   // Replace with a strong key
    resave: false,
    saveUninitialized: true
}));

// Set EJS as the templating engine
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static(__dirname + "/public"));

// Generate and send OTP via email
async function sendOtpEmail(email, otp) {
    let transporter = nodemailer.createTransport({
        service: "gmail", 
        auth: {
            user: "staymates123@gmail.com", // Your email
            pass: "evnt aepa yubz zuqc", // Your email password or app-specific password
        },
    });

    let mailOptions = {
        from: '"Stay-Mates" <staymates123@gmail.com>',
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is: ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("OTP email sent to:", email);
    } catch (error) {
        console.error("Error sending OTP email:", error);
    }
}

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html", (err) => {
        if (err) {
            res.status(500).send("Error loading the page.");
        }
    });
});

app.get("/signup", (req, res) => {
    res.render("login"); // Renders login.ejs from the "views" directory
});

app.post("/submit", async (req, res) => {
    const loginusername = req.body.loginusername.trim(); // Trim whitespace
    const loginpassword = req.body.loginpassword.trim(); // Trim whitespace

    console.log("Attempting login for user:", loginusername); // Debugging output

    try {
        // Query to find the user by username
        const result = await db.query(
            "SELECT id, password FROM users WHERE username = $1;",
            [loginusername]
        );

        // Check if the user was found
        if (result.rows.length > 0) {
            const storedPassword = result.rows[0].password;
            const userId = result.rows[0].id; // Get user ID for profile check

            console.log("Password retrieved from database:", storedPassword); // Debugging output

            // Compare the provided password with the stored password
            if (loginpassword === storedPassword) {
                console.log("Login successful");
                console.log(`Welcome ${loginusername}`);
                
                // Set session for logged-in user
                req.session.loggedIn = true;
                req.session.username = loginusername;
                req.session.userId = userId; // Store user ID in session

                // Check if profile exists
                const profileCheckResult = await db.query(
                    "SELECT * FROM profiles WHERE user_id = $1;",
                    [userId]
                );

                // If no profile exists, redirect to create profile page
                if (profileCheckResult.rows.length === 0) {

                    return res.render('create_profile'); // Correct

                }

                // If profile exists, redirect to profile page
                const profile = await db.query(
                    "SELECT * FROM profiles WHERE user_id = $1",
                    [userId]
                );
                return res.render("new.ejs", { profile: profile.rows[0] });
            } else {
                console.log("Login failed: Incorrect username or password");
                res.send("Incorrect username or password. Please try again.");
            }
        } else {
            console.log("Login failed: User not found");
            res.send("Incorrect username or password. Please try again.");
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Internal server error. Please try again later.");
    }
});




// Handle POST request to send OTP
app.post("/sendotp", async (req, res) => {
    const email = req.body.emailid;
    const username = req.body.username;
    const password = req.body.password;

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999);

    // Save OTP in the session
    req.session.otp = otp;
    req.session.user = { email, username, password };

    console.log("Email:", email);
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Generated OTP:", otp);

    // Send OTP to the user's email
    await sendOtpEmail(email, otp);

    res.render("verify.ejs"); // Redirect to OTP verification page

});

// Handle OTP verification
app.post("/verify", async (req, res) => {
    const userOtp = parseInt(req.body.verifyotp, 10); // OTP entered by the user
    const sessionOtp = req.session.otp; // OTP stored in the session

    if (userOtp === sessionOtp) {
        console.log("User verified successfully");
        is_verified = true;

        const { username, email, password } = req.session.user;
        
        try {
            await db.query(
                "INSERT INTO users (username, email, password, otp_code, is_verified) VALUES ($1, $2, $3, $4, $5)",
                [username, email, password, userOtp, is_verified]
            );

            console.log("User created successfully!");

            // Clear session data
            req.session.otp = null;
            req.session.user = null;
           
          

            res.redirect("/signup");
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).send("Error creating user. Please try again.");
        }
    } else {
        return res.send("Invalid OTP. Please try again.");
    }
});

app.post('/submit_profile', upload.single('profile_picture'), async (req, res) => {
    // Ensure user is authenticated
    const user_id = req.session.userId;

    if (!user_id) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    // Extract profile fields from req.body
    const name = req.body.full_name;
    const age = req.body.age;
    const phone = req.body.phone;
    const university = req.body.university;
    const address = req.body.address;
    const smoker = req.body.smoker;
    const food = req.body.food;
    const adhar_number = req.body.adhar_number;
    const twitter = req.body.twitter;
    const instagram = req.body.instagram;
    const facebook = req.body.facebook;
    const profile_picture = req.file ? req.file.buffer : null;

    try {
        const result = await db.query(
            `INSERT INTO profiles (user_id, full_name, age, profile_picture, phone, university, address, smoker, food, adhar_number, twitter, instagram, facebook)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [user_id, name, age, profile_picture, phone, university, address, smoker, food, adhar_number, twitter, instagram, facebook]
        );

        console.log("Profile created successfully for user:", user_id);
        
        // Optionally use res.redirect if profile page has its own route
        return res.render("new.ejs", { profile: result.rows[0] });
       
    } catch (err) {
        console.error("Error creating profile:", err);
        res.status(500).json({ error: 'Failed to create profile' });
    }
});

app.get('/profile/edit', async (req, res) => {
    const user_id = req.session.userId;
    console.log(user_id);

    try {
       const result = await db.query(
        "SELECT * FROM profiles WHERE user_id = $1",
        [user_id]
       );
        res.render('edit_profile.ejs', { profile: result.rows[0] });
    } catch (error) {
        res.status(500).send("Error fetching profile");
    }
});

app.post('/profile/edit', upload.single('profile_picture'), async (req, res) => {
    try {
        const result = await db.query(
            "UPDATE profiles SET full_name = $1, phone = $2, age = $3, university = $4, address = $5, smoker = $6, food = $7, adhar_number = $8, twitter = $9, instagram = $10, facebook = $11, profile_picture = $12 WHERE user_id = $13 RETURNING *;",
            [
                req.body.full_name,
                req.body.phone,
                req.body.age,
                req.body.university,
                req.body.address,
                req.body.smoker,  
                req.body.food,
                req.body.adhar_number,
                req.body.twitter,
                req.body.instagram,
                req.body.facebook,
                req.file ? req.file.buffer : null,  // Set profile picture if uploaded
                req.session.userId  // User ID from session
            ]
        );

        // Redirect to profile page after updating, rendering the updated profile
        return res.render("new.ejs", { profile: result.rows[0] });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("Error updating profile");
    }
});

// Route for Explore Page
app.get('/explore', async (req, res) => {
    try {
        // Fetch other users' profiles
        const result = await db.query(
            "SELECT user_id, full_name, age, profile_picture FROM profiles WHERE user_id != $1",
            [req.session.userId]
        );
        const users = result.rows; // Get the user data

        // Fetch the current user's profile picture
        const user_profile = await db.query(
            "SELECT profile_picture FROM profiles WHERE user_id = $1",
            [req.session.userId]
        );

        let profilePictureBase64 = null;
        if (user_profile.rows[0] && user_profile.rows[0].profile_picture) {
            profilePictureBase64 = user_profile.rows[0].profile_picture.toString('base64');
        }
        
        // Pass users and current user's profile to the template
        res.render('explore.ejs', { profile: users, his_profile: { profile_picture: profilePictureBase64 } });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Error fetching users");
    }
});

app.get('/profile/:id', async (req, res) => {
    try {
        const their_Id = req.params.id;
        const my_id = req.session.userId;
        
        // Log userId and my_id for debugging
        console.log("Requested User ID:", their_Id);
        console.log("Logged-in User ID:", my_id);

        // Fetch the profile of the requested user
        const result = await db.query("SELECT * FROM profiles WHERE user_id = $1", [their_Id]);
        console.log("Requested User Profile Data:", result.rows);

        // Fetch the profile picture of the logged-in user
        const myProfile = await db.query("SELECT profile_picture FROM profiles WHERE user_id = $1", [my_id]);
        console.log("Logged-in User Profile Picture Data:", myProfile.rows);

        if (result.rows.length > 0) {
            const userProfile = result.rows[0];
            res.render('others_profile.ejs', { profile: userProfile, my: myProfile.rows[0] });
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).send("Server error");
    }
});

app.get('/friendlist', async (req, res) => {
    const currentUserId = req.session.userId;
    console.log(currentUserId);

    try {
        // Fetch pending friend requests for the current user
        const pendingRequestsResult = await db.query(`
            SELECT profiles.user_id, profiles.full_name, profiles.profile_picture 
            FROM friend_requests 
            JOIN profiles ON friend_requests.sender_id = profiles.user_id 
            WHERE friend_requests.receiver_id = $1 AND friend_requests.status = 'pending'
        `, [currentUserId]);

        // Convert profile pictures to base64
        const pendingRequests = pendingRequestsResult.rows.map(request => ({
            ...request,
            profile_picture: request.profile_picture ? `data:image/jpeg;base64,${request.profile_picture.toString('base64')}` : null
        }));

        // Fetch accepted friends for the current user
        const acceptedFriendsResult = await db.query(`
            SELECT profiles.user_id, profiles.full_name, profiles.profile_picture 
            FROM friendships 
            JOIN profiles ON friendships.friend_id = profiles.user_id 
            WHERE friendships.user_id = $1
        `, [currentUserId]);

        // Convert profile pictures to base64
        const acceptedFriends = acceptedFriendsResult.rows.map(friend => ({
            ...friend,
            profile_picture: friend.profile_picture ? `data:image/jpeg;base64,${friend.profile_picture.toString('base64')}` : null
        }));

        // Render the friendlist page with pending and accepted friends data
        res.render('friendlist.ejs', { 
            pendingRequests, 
            acceptedFriends 
        });
    } catch (error) {
        console.error("Error fetching friend list:", error);
        res.status(500).send("An error occurred while loading the friend list.");
    }
});

// Route to handle friend request addition
app.post('/friend/add/:userId', async (req, res) => {
    const senderId = req.session.userId;  // Assuming the user ID of the logged-in user is stored in the session
    const receiverId = req.params.userId;

    try {
        // Insert a new friend request
        await db.query(`
            INSERT INTO friend_requests (sender_id, receiver_id, status)
            VALUES ($1, $2, 'pending')
            ON CONFLICT (sender_id, receiver_id) DO NOTHING
        `, [senderId, receiverId]);

        res.status(200).json({ message: "Friend request sent!" });
    } catch (error) {
        console.error("Error adding friend:", error);
        res.status(500).json({ message: "Error adding friend request." });
    }
});

// Accept friend request
app.post('/friend/accept/:userId', async (req, res) => {
    const senderId = req.params.userId;  // ID of the user who sent the friend request
    const receiverId = req.session.userId;  // ID of the current user who is accepting the request

    try {
        

        // Insert friendship into the friendships table
        await db.query(`
            INSERT INTO friendships (user_id, friend_id) 
            VALUES ($1, $2), ($2, $1) 
            ON CONFLICT DO NOTHING
        `, [receiverId, senderId]);

        // Remove the friend request from the friend_requests table
        await db.query(`
            DELETE FROM friend_requests 
            WHERE sender_id = $1 AND receiver_id = $2
        `, [senderId, receiverId]);


        res.json({ message: "Friend request accepted!" });
    } catch (error) {
        await db.query('ROLLBACK');  // Rollback transaction in case of error
        console.error("Error accepting friend request:", error);
        res.status(500).json({ message: "An error occurred while accepting the friend request." });
    }
});

// Decline friend request
app.post('/friend/decline/:userId', async (req, res) => {
    const senderId = req.params.userId;  // ID of the user who sent the friend request
    const receiverId = req.session.userId;  // ID of the current user who is declining the request

    try {
        // Remove the friend request from the friend_requests table
        await db.query(`
            DELETE FROM friend_requests 
            WHERE sender_id = $1 AND receiver_id = $2
        `, [senderId, receiverId]);

        res.json({ message: "Friend request declined." });
    } catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ message: "An error occurred while declining the friend request." });
    }
});

app.get('/host_property', async (req, res) => { 
    const my_id = req.session.userId; // Assuming you have a session-based user ID
    console.log(my_id);
    try {

        const user_profile = await db.query(
            "SELECT profile_picture FROM profiles WHERE user_id = $1",
            [req.session.userId]
        );

        let profilePictureBase64 = null;
        if (user_profile.rows[0] && user_profile.rows[0].profile_picture) {
            profilePictureBase64 = user_profile.rows[0].profile_picture.toString('base64');
        }

        // Pass current user's profile to the template
        res.render('host.ejs', { profile: { profile_picture: profilePictureBase64 } });

    } catch (error) {
        console.error("Error loading host property page:", error);
        res.status(500).send("Server Error");
    }
});

app.get('/view_property', async (req, res) => {
    const my_id = req.session.userId;

    if (!my_id) {
        return res.redirect('/login'); // Redirect to login page if the user is not logged in
    }

    try {
        // Fetch properties and associated images
        const propertiesResult = await db.query(
            `SELECT 
                p.property_id, 
                p.property_type, 
                p.address, 
                p.requirement, 
                p.description, 
                p.rent_per_day, 
                p.rent_per_week, 
                p.rent_per_month, 
                p.occupancy, 
                p.availability_date, 
                p.pets_allowed, 
                p.smoking_allowed, 
                pi.image_data 
            FROM properties p
            LEFT JOIN property_images pi ON p.property_id = pi.property_id`
        );

        // Check if there are any properties
        if (propertiesResult.rows.length === 0) {
            return res.status(404).send("No properties found.");
        }

        // Map properties and group images by property_id
        const propertiesWithImages = propertiesResult.rows.reduce((acc, row) => {
            if (!acc[row.property_id]) {
                acc[row.property_id] = {
                    property_id: row.property_id,
                    property_type: row.property_type,
                    address: row.address,
                    requirement: row.requirement,
                    description: row.description,
                    rent_per_day: row.rent_per_day,
                    rent_per_week: row.rent_per_week,
                    rent_per_month: row.rent_per_month,
                    occupancy: row.occupancy,
                    availability_date: row.availability_date,
                    pets_allowed: row.pets_allowed,
                    smoking_allowed: row.smoking_allowed,
                    images: []  // Initialize an empty array for images
                };
            }

            // Push base64-encoded images into the images array
            if (row.image_data) {
                acc[row.property_id].images.push(row.image_data.toString('base64'));
            }

            return acc;
        }, {});

        // Convert the properties object to an array
        const propertiesArray = Object.values(propertiesWithImages);

        // Pass the data to the EJS template
        res.render('properties.ejs', { 
            properties: propertiesArray,
            my_id: my_id 
        });

    } catch (error) {
        console.error("Error fetching properties:", error);
        res.status(500).send("Internal Server Error");
    }
});




app.post('/show_interest/:property_id', async (req, res) => {
    const propertyId = req.params.property_id;
    const userId = req.body.user_id;  // User ID from the form (logged-in user)

    try {
        // Fetch the owner of the property
        const ownerResult = await db.query(`
            SELECT user_id FROM properties WHERE property_id = $1
        `, [propertyId]);

        if (ownerResult.rows.length === 0) {
            return res.status(404).send("Property not found.");
        }

        const ownerId = ownerResult.rows[0].user_id;

        // Insert the interest into the "interests" table
        await db.query(`
            INSERT INTO interests (property_id, requested_user_id, user_id, accepted)
            VALUES ($1, $2, $3, false)
        `, [propertyId, userId, ownerId]);

        // Redirect back to the properties page or another appropriate page
        res.render('properties.ejs');  // Redirect to the properties list

    } catch (error) {
        console.error("Error submitting interest:", error);
        res.status(500).send("Error showing interest in property.");
    }
});




app.get('/myhostedproperties', async (req, res) => {
    const my_id = req.session.userId;
console.log(my_id);
    // Check if user is logged in
    if (!my_id) {
        return res.status(401).send("Please log in to view your properties.");
    }

    try {
        // Fetch properties for the logged-in user along with their images
        const propertiesResult = await db.query(
            `SELECT 
                p.property_id, 
                p.property_type, 
                p.address, 
                p.requirement, 
                p.description, 
                p.rent_per_day, 
                p.rent_per_week, 
                p.rent_per_month, 
                p.occupancy, 
                p.availability_date, 
                p.pets_allowed, 
                p.smoking_allowed, 
                pi.image_data 
            FROM properties p
            LEFT JOIN property_images pi ON p.property_id = pi.property_id
            WHERE p.user_id = $1`,
            [my_id]
        );

        // Check if there are any properties for this user
        if (propertiesResult.rows.length === 0) {
            return res.status(404).send("No properties found for this user.");
        }

        // Group properties and their images by property_id
        const propertiesWithImages = propertiesResult.rows.reduce((acc, row) => {
            // Initialize the property if it hasn't been added yet
            if (!acc[row.property_id]) {
                acc[row.property_id] = {
                    property_id: row.property_id,
                    property_type: row.property_type,
                    address: row.address,
                    requirement: row.requirement,
                    description: row.description,
                    rent_per_day: row.rent_per_day,
                    rent_per_week: row.rent_per_week,
                    rent_per_month: row.rent_per_month,
                    occupancy: row.occupancy,
                    availability_date: row.availability_date,
                    pets_allowed: row.pets_allowed,
                    smoking_allowed: row.smoking_allowed,
                    images: []  // Start with an empty array for images
                };
            }
            // Convert binary image data to base64 and add to images array
            if (row.image_data) {
                acc[row.property_id].images.push(row.image_data.toString('base64'));
            }
            return acc;
        }, {});

        // Convert the object back to an array for easier handling in EJS
        const propertiesArray = Object.values(propertiesWithImages);

        // Render the 'myproperties.ejs' file with the user's properties data
        res.render('myproperties.ejs', {
            properties: propertiesArray,
            my_id: my_id
        });

    } catch (error) {
        console.error("Error fetching user's properties:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/people_interested/:property_id', async (req, res) => {
    const propertyId = req.params.property_id;
    const userid = req.session.userId;
    try {
        // Fetch the users who are interested in the property
        const interestedUsers = await db.query(
            `SELECT u.id, u.username, u.email 
             FROM interests i 
             JOIN users u ON i.user_id = u.id 
             WHERE i.property_id = $1`,
            [propertyId]
        );

        // Fetch the property details
        const property = await db.query(
            `SELECT * FROM properties WHERE property_id = $1`,
            [propertyId]
        );

        if (interestedUsers.rows.length === 0) {
            return res.status(404).send('No users interested in this property.');
        }

        res.render('people_interested', {
            property: property.rows[0],
            interestedUsers: interestedUsers.rows
        });

    } catch (error) {
        console.error("Error fetching interested users:", error);
        res.status(500).send("Error fetching interested users.");
    }
});



app.post('/host/property', upload.array('images'), async (req, res) => {
    const my_id = req.session.userId; // Assuming you have a session-based user ID
    console.log(my_id);
    const {
        requirement, property_type, description, pets_allowed, smoking_allowed,
        occupancy, availability_date, rent_per_day, rent_per_week, rent_per_month,
        address, latitude, longitude
    } = req.body;
    const images = req.files; // Images uploaded via multer

    try {
        // Insert the main property details
        const propertyResult = await db.query(
            `INSERT INTO properties (
                user_id, requirement, property_type, description, pets_allowed, 
                smoking_allowed, occupancy, availability_date, rent_per_day, 
                rent_per_week, rent_per_month, address, latitude, longitude
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
            RETURNING property_id`,
            [
                my_id, requirement, property_type, description, pets_allowed, 
                smoking_allowed, occupancy, availability_date, rent_per_day, 
                rent_per_week, rent_per_month, address, latitude, longitude
            ]
        );

        const propertyId = propertyResult.rows[0].property_id;

        // Insert each image into the property_images table
        for (const image of images) {
            const imageData = image.buffer.toString('base64'); // Convert image buffer to base64
            await db.query(
                `INSERT INTO property_images (property_id, image_data)
                 VALUES ($1, $2)`,
                [propertyId, imageData]
            );
        }

        // Redirect to the explore page after posting the property
        res.redirect('/explore');
    } catch (error) {
        console.error("Error inserting property:", error);
        res.status(500).send("Server Error");
    }
});


app.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Could not log out. Please try again.");
        }
        
        // Redirect to login page
        res.render('login.ejs'); // Adjust this path as needed
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
