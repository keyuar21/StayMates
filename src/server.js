import express, { query } from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import crypto from "crypto";
import session from "express-session";
import pkg from "pg";
import multer from 'multer';
import path from 'path';
import dotenv from "dotenv";

dotenv.config({ path: process.cwd() + "/.env" });

const app = express();
const port = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

const { Client } = pkg;

const db = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    ssl: process.env.DB_SSL === "true" ? {
        rejectUnauthorized: false,
        channelBinding: process.env.DB_CHANNEL_BINDING || undefined
    } : false
});

console.log('Connecting to database:', process.env.DB_NAME);

let is_verified = false;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


app.use(express.urlencoded({ extended: true }));

// Set up sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));


app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));


app.use(express.static(__dirname + "/public"));


// Use environment variables for sensitive credentials
const transporter = nodemailer.createTransport({
        service: "gmail", 
        auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        },
    });

async function sendOtpEmail(email, otp) {
    let mailOptions = {
        from: `"Stay-Mates" <${process.env.EMAIL_USER}>`,
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
    res.render("login"); 
});

app.post("/submit", async (req, res) => {
    const loginusername = req.body.loginusername.trim(); 
    const loginpassword = req.body.loginpassword.trim(); 

    console.log("Attempting login for user:", loginusername); 

    try {
  
        const result = await db.query(
            "SELECT id, password FROM users WHERE username = $1;",
            [loginusername]
        );

    
        if (result.rows.length > 0) {
            const storedPassword = result.rows[0].password;
            const userId = result.rows[0].id; 

            console.log("Password retrieved from database:", storedPassword);

          
            if (loginpassword === storedPassword) {
                console.log("Login successful");
                console.log(`Welcome ${loginusername}`);
                
               
                req.session.loggedIn = true;
                req.session.username = loginusername;
                req.session.userId = userId; 

            
                const profileCheckResult = await db.query(
                    "SELECT * FROM profiles WHERE user_id = $1;",
                    [userId]
                );

            
                if (profileCheckResult.rows.length === 0) {

                    return res.render('create_profile'); 

                }

 
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





app.post("/sendotp", async (req, res) => {
    const email = req.body.emailid;
    const username = req.body.username;
    const password = req.body.password;


    const otp = crypto.randomInt(100000, 999999);


    req.session.otp = otp;
    req.session.user = { email, username, password };

    console.log("Email:", email);
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Generated OTP:", otp);


    await sendOtpEmail(email, otp);

    res.render("verify.ejs"); 

});


app.post("/verify", async (req, res) => {
    const userOtp = parseInt(req.body.verifyotp, 10); 
    const sessionOtp = req.session.otp; 

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

    const user_id = req.session.userId;

    if (!user_id) {
        return res.status(401).json({ error: 'User not authenticated' });
    }


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
                req.file ? req.file.buffer : null,  
                req.session.userId 
            ]
        );

        
        return res.render("new.ejs", { profile: result.rows[0] });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("Error updating profile");
    }
});


app.get('/explore', async (req, res) => {
    try {

        const result = await db.query(
            "SELECT user_id, full_name, age, profile_picture FROM profiles WHERE user_id != $1",
            [req.session.userId]
        );
        const users = result.rows; 

  
        const user_profile = await db.query(
            "SELECT profile_picture FROM profiles WHERE user_id = $1",
            [req.session.userId]
        );

        let profilePictureBase64 = null;
        if (user_profile.rows[0] && user_profile.rows[0].profile_picture) {
            profilePictureBase64 = user_profile.rows[0].profile_picture.toString('base64');
        }
      
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
        
    
        console.log("Requested User ID:", their_Id);
        console.log("Logged-in User ID:", my_id);

      
        const result = await db.query("SELECT * FROM profiles WHERE user_id = $1", [their_Id]);
        console.log("Requested User Profile Data:", result.rows);


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
        // Fetch current user's profile for navbar
        let my_profile = null;
        if (currentUserId) {
            const profileResult = await db.query(`
                SELECT full_name, profile_picture FROM profiles WHERE user_id = $1
            `, [currentUserId]);
            if (profileResult.rows.length > 0) {
                my_profile = profileResult.rows[0];
                if (my_profile.profile_picture) {
                    if (typeof my_profile.profile_picture === 'string') {
                        my_profile.profile_picture = my_profile.profile_picture;
                    } else {
                        my_profile.profile_picture = my_profile.profile_picture.toString('base64');
                    }
                }
            }
        }
       
        const pendingRequestsResult = await db.query(`
            SELECT profiles.user_id, profiles.full_name, profiles.profile_picture 
            FROM friend_requests 
            JOIN profiles ON friend_requests.sender_id = profiles.user_id 
            WHERE friend_requests.receiver_id = $1 AND friend_requests.status = 'pending'
        `, [currentUserId]);
      
        const pendingRequests = pendingRequestsResult.rows.map(request => ({
            ...request,
            profile_picture: request.profile_picture ? request.profile_picture.toString('base64') : null
        }));
       
        const acceptedFriendsResult = await db.query(`
            SELECT profiles.user_id, profiles.full_name, profiles.profile_picture 
            FROM friendships 
            JOIN profiles ON friendships.friend_id = profiles.user_id 
            WHERE friendships.user_id = $1
        `, [currentUserId]);

        const acceptedFriends = acceptedFriendsResult.rows.map(friend => ({
            ...friend,
            profile_picture: friend.profile_picture ? friend.profile_picture.toString('base64') : null
        }));
       
        res.render('friendlist.ejs', { 
            pendingRequests, 
            acceptedFriends,
            my_profile // Pass the current user's profile for navbar
        });
    } catch (error) {
        console.error("Error fetching friend list:", error);
        res.status(500).send("An error occurred while loading the friend list.");
    }
});


app.post('/friend/add/:userId', async (req, res) => {
    const senderId = req.session.userId;  // Assuming the user ID of the logged-in user is stored in the session
    const receiverId = req.params.userId;

    try {
        
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


app.post('/friend/accept/:userId', async (req, res) => {
    const senderId = req.params.userId;  // ID of the user who sent the friend request
    const receiverId = req.session.userId;  // ID of the current user who is accepting the request

    try {
        

       
        await db.query(`
            INSERT INTO friendships (user_id, friend_id) 
            VALUES ($1, $2), ($2, $1) 
            ON CONFLICT DO NOTHING
        `, [receiverId, senderId]);

        
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
    const my_id = req.session.userId;  // User ID from session

    try {
        // Fetch user's profile data for navbar
        let my_profile = null;
        if (my_id) {
            const profileResult = await db.query(`
                SELECT full_name, profile_picture FROM profiles WHERE user_id = $1
            `, [my_id]);
            if (profileResult.rows.length > 0) {
                my_profile = profileResult.rows[0];
                // Convert profile picture to base64 if it exists and is binary
                if (my_profile.profile_picture) {
                    if (typeof my_profile.profile_picture === 'string') {
                        // Already base64
                        my_profile.profile_picture = my_profile.profile_picture;
                    } else {
                        // Binary data, convert to base64
                        my_profile.profile_picture = my_profile.profile_picture.toString('base64');
                    }
                }
            }
        }
       
        const propertiesResult = await db.query(`
            SELECT 
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
        `);

  
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

            if (row.image_data) {
                // Always convert binary data to base64 for display
                acc[row.property_id].images.push(row.image_data.toString('base64'));
            }

            return acc;
        }, {});

        // Convert to an array
        const propertiesArray = Object.values(propertiesWithImages);

        // Debug: Log the properties data being passed to template
        console.log('Properties being passed to template:');
        propertiesArray.forEach((property, index) => {
            console.log(`Property ${index + 1}:`);
            console.log(`  ID: ${property.property_id}`);
            console.log(`  Type: ${property.property_type}`);
            console.log(`  Address: ${property.address}`);
            console.log(`  Images count: ${property.images ? property.images.length : 0}`);
            if (property.images && property.images.length > 0) {
                console.log(`  First image length: ${property.images[0].length}`);
                console.log(`  First image start: ${property.images[0].substring(0, 50)}...`);
            }
            console.log('---');
        });

        // Pass properties, user ID, and profile data to the template
        res.render('properties.ejs', { 
            properties: propertiesArray, 
            my_id: my_id,
            my_profile: my_profile
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
        console.log("shown interest ");
        res.redirect('/view_property');

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
        // Fetch user's profile data for navbar
        let my_profile = null;
        if (my_id) {
            const profileResult = await db.query(`
                SELECT full_name, profile_picture FROM profiles WHERE user_id = $1
            `, [my_id]);
            if (profileResult.rows.length > 0) {
                my_profile = profileResult.rows[0];
                // Convert profile picture to base64 if it exists and is binary
                if (my_profile.profile_picture) {
                    if (typeof my_profile.profile_picture === 'string') {
                        // Already base64
                        my_profile.profile_picture = my_profile.profile_picture;
                    } else {
                        // Binary data, convert to base64
                        my_profile.profile_picture = my_profile.profile_picture.toString('base64');
                    }
                }
            }
        }
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
                // Always convert binary data to base64 for display
                acc[row.property_id].images.push(row.image_data.toString('base64'));
            }
            return acc;
        }, {});

        // Convert the object back to an array for easier handling in EJS
        const propertiesArray = Object.values(propertiesWithImages);

        // Render the 'myproperties.ejs' file with the user's properties data
        res.render('myproperties.ejs', {
            properties: propertiesArray,
            my_id: my_id,
            my_profile: my_profile
        });

    } catch (error) {
        console.error("Error fetching user's properties:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/people_interested/:property_id', async (req, res) => {
    const propertyId = req.params.property_id; // Capture the property_id from the URL
    console.log(propertyId); // Check if the propertyId is being captured correctly

    const userid = req.session.userId;

    // Check if the user is logged in
    if (!userid) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }

    try {
        // Fetch the users who are interested in the property
        const interestedUsersResult = await db.query(
            `SELECT 
                profiles.full_name, 
                profiles.profile_picture, 
                interests.requested_user_id, 
                interests.accepted  
             FROM interests 
             JOIN profiles ON  interests.requested_user_id = profiles.user_id 
             WHERE interests.property_id = $1`,
            [propertyId]
        );
        // Convert profile_picture to base64 only
        const interestedUsers = interestedUsersResult.rows.map(user => ({
            ...user,
            profile_picture: user.profile_picture ? user.profile_picture.toString('base64') : null
        }));
        
        // Fetch the property details
        const property = await db.query(
            `SELECT property_type, address, rent_per_day, rent_per_week, rent_per_month 
             FROM properties WHERE property_id = $1`,
            [propertyId]
        );

        // Fetch current user's profile for navbar
        let my_profile = null;
        if (userid) {
            const profileResult = await db.query(
                `SELECT full_name, profile_picture FROM profiles WHERE user_id = $1`,
                [userid]
            );
            if (profileResult.rows.length > 0) {
                my_profile = profileResult.rows[0];
                if (my_profile.profile_picture) {
                    if (typeof my_profile.profile_picture === 'string') {
                        my_profile.profile_picture = my_profile.profile_picture;
                    } else {
                        my_profile.profile_picture = my_profile.profile_picture.toString('base64');
                    }
                }
            }
        }

        // Check if the property exists
        if (property.rows.length === 0) {
            return res.status(404).send('Property not found.');
        }

        // Check if no users are interested
        if (interestedUsers.length === 0) {
            return res.status(404).send('No users interested in this property.');
        }

        // Render the template with property and interested users
        res.render('people_interested.ejs', {
            property: property.rows[0],
            interestedUsers: interestedUsers,
            my_profile: my_profile
        });

    } catch (error) {
        console.error("Error fetching interested users:", error);
        res.status(500).send("Error fetching interested users.");
    }
});

app.post('/people_interested/:property_id/:requested_user_id', async (req, res) => {
    const { property_id, requested_user_id } = req.params;
    const { action } = req.body;
    const owner_id = req.session.userId; // Assuming the owner is logged in

    if (action === 'accept') {
        try {
            // Create a new chat room (association between the owner and the accepted user)
            const result = await db.query(
                `INSERT INTO chat_rooms (property_id, owner_id, member_id) 
                 VALUES ($1, $2, $3) RETURNING room_id`,
                [property_id, owner_id, requested_user_id]
            );

            const room_id = result.rows[0].room_id;

            // Mark the user as accepted in the 'interests' table
            await db.query(
                `UPDATE interests SET accepted = TRUE WHERE property_id = $1 AND requested_user_id = $2`,
                [property_id, requested_user_id]
            );

            // Redirect to the chat room
            res.redirect(`/chat/${room_id}`);
        } catch (error) {
            console.error("Error accepting user:", error);
            res.status(500).send("Error accepting user.");
        }
    } else if (action === 'reject') {
        try {
            // Mark the user as rejected
            await db.query(
                `UPDATE interests SET accepted = FALSE WHERE property_id = $1 AND requested_user_id = $2`,
                [property_id, requested_user_id]
            );

            res.redirect(`/people_interested/${property_id}`);
        } catch (error) {
            console.error("Error rejecting user:", error);
            res.status(500).send("Error rejecting user.");
        }
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

        // Insert each image into the property_images table as binary data
        for (const image of images) {
            await db.query(
                `INSERT INTO property_images (property_id, image_data)
                 VALUES ($1, $2)`,
                [propertyId, image.buffer]
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

app.get('/new', async (req, res) => {
    const user_id = req.session.userId;
    if (!user_id) {
        return res.redirect('/login');
    }
    try {
        const result = await db.query(
            'SELECT * FROM profiles WHERE user_id = $1',
            [user_id]
        );
        if (result.rows.length === 0) {
            return res.redirect('/create_profile');
        }
        res.render('new.ejs', { profile: result.rows[0] });
    } catch (error) {
        console.error('Error fetching profile for /new:', error);
        res.status(500).send('Error loading profile page.');
    }
});

db.connect()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
