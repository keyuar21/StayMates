import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import crypto from "crypto";
import session from "express-session";

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

let storage = [];

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
        service: "gmail", // or any other email service
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

app.post("/submit", (req, res) => {
    const loginusername = req.body.loginusername;
    const loginpassword = req.body.loginpassword;

    // Check if the user exists in the storage array
    const user = storage.find(user => user.username === loginusername && user.password === loginpassword);

    if (user) {
        console.log("Login successful");
        console.log(`Welcome ${user.username}`);
        
        // Set session for logged-in user
        req.session.loggedIn = true;
        req.session.username = user.username;

        // Redirect to profile page or any authenticated page
        res.render("profile.ejs");
    } else {
        console.log("Login failed: Incorrect username or password");
        res.send("Incorrect username or password. Please try again.");
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
app.post("/verify", (req, res) => {
    const userOtp = req.body.verifyotp; // OTP entered by the user
    const sessionOtp = req.session.otp; // OTP stored in the session

    if (parseInt(userOtp) === sessionOtp) {
        console.log("User verified successfully");
        
        const newUser = req.session.user;
        storage.push(newUser);

        // Clear the session data
        req.session.otp = null;
        req.session.user = null;

        console.log("User created successfully!");

        res.redirect("/signup");
    } else {
        return res.send("Invalid OTP. Please try again.");
    }
});

app.post('/submit-profile', (req, res) => {
    // Access the submitted form data from req.body
    const { name, email, phone, age, university, address, smoker, food } = req.body;

    // Log or process the data
    console.log('Profile Information:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Age:', age);
    console.log('University:', university);
    console.log('Address:', address);
    console.log('Smoker:', smoker);
    console.log('Food Preference:', food);

    // Respond to the user (e.g., redirect, render, etc.)
   
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
