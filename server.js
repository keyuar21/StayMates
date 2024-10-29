import express from "express";
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
           
            alert("You have been logged in redirecting you to the login page ");

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

app.get('/explore', async (req, res) => {
    try {
        const users = await db.query("SELECT * FROM profiles  WHERE user_id != $1", [req.session.userId]); // Exclude the logged-in user
        res.render('explore.ejs', { user: users.rows });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Error fetching users");
    }
});


app.post('/submit-profile', (req, res) => {
    
// this is different 

});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
