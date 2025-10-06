const express = require("express");
const app = express();
const path = require("path");
const ejsMate = require("ejs-mate");
const mysql = require('mysql2');
const { v4: uuidv4 } = require("uuid");

app.set("views", path.join(__dirname, "/views"));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "mood_tracker",
    password: "",
    port: 3306,
});

app.get("/", (req, res) => {
    const user = req.session?.user || null;
    res.render("./posts/index.ejs", { user });
});

app.get("/loginpage", (req, res) => {
    res.render("./posts/login.ejs", { user: null });
});

app.get("/registerpage", (req, res) => {
    res.render("./posts/register.ejs", { user: null });
});

app.get("/:id/addpost", (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM users WHERE id = ?";
    connection.query(query, [id], (err, result) => {
        if (err) return res.status(500).send("Database error");
        if (result.length === 0) return res.send("User not found");
        const user = result[0];
        res.render("./posts/addpost.ejs", { user });
    });
});

app.get("/logout", (req, res) => {
    res.redirect("/loginpage");
});

app.post("/:id/deletepost", (req, res) => {
    const { id } = req.params;
    const { post_id } = req.body;
    const query = "DELETE FROM posts WHERE id = ? AND user_id = ?";
    connection.query(query, [post_id, id], (err, result) => {
        if (err) return res.status(500).send("Database error");
        if (result.affectedRows === 0) return res.send("Post not found or you don't have permission to delete it");
        res.redirect("/user/" + id);
    });
});

app.post("/register", (req, res) => {
    let { username, password } = req.body;
    const checkQuery = "SELECT * FROM users WHERE username = ?";
    connection.query(checkQuery, [username], (err, results) => {
        if (err) return res.status(500).send("Database error");
        if (results.length > 0) {
            return res.send(`<script>alert("Username already exists! Redirecting to login page."); window.location.href = "/loginpage";</script>`);
        }
        const id = uuidv4();
        const insertQuery = "INSERT INTO users (id, username, password) VALUES (?, ?, ?)";
        connection.query(insertQuery, [id, username, password], (err, result) => {
            if (err) return res.status(500).send("Database error");
            return res.send(`<script>alert("Registration successful! Redirecting to login page."); window.location.href = "/loginpage";</script>`);
        });
    });
});

app.get("/:id/post/:postId", (req, res) => {
    const { id, postId } = req.params;
    const query = "SELECT * FROM posts WHERE id = ? AND user_id = ?";
    connection.query(query, [postId, id], (err, result) => {
        if (err) return res.status(500).send("Database error");
        if (result.length === 0) return res.send("Post not found");
        const post = result[0];
        res.render("./posts/viewpost.ejs", { user: { id }, post });
    });
});

app.get("/:id/editpost/:postId", (req, res) => {
    const { id, postId } = req.params;
    const query = "SELECT * FROM posts WHERE id = ? AND user_id = ?";
    connection.query(query, [postId, id], (err, result) => {
        if (err) return res.status(500).send("Database error");
        if (result.length === 0) return res.send("Post not found");
        const post = result[0];
        res.render("./posts/editpost.ejs", { user: { id }, post });
    });
});

app.post("/:id/editpost/:postId", (req, res) => {
    const { id, postId } = req.params;
    const { content } = req.body;
    const query = "UPDATE posts SET content = ? WHERE id = ? AND user_id = ?";
    connection.query(query, [content, postId, id], (err, result) => {
        if (err) return res.status(500).send("Database error");
        res.redirect(`/user/${id}`);
    });
});

app.post("/addpost", (req, res) => {
    const { user_id, content } = req.body;
    const postId = uuidv4();
    const query = "INSERT INTO posts (id, user_id, content) VALUES (?, ?, ?)";
    connection.query(query, [postId, user_id, content], (err) => {
        if (err) return res.status(500).send("Database error");
        const postsQuery = "SELECT * FROM posts WHERE user_id = ?";
        connection.query(postsQuery, [user_id], (err, posts) => {
            if (err) return res.status(500).send("Database error");
            res.render("./posts/user.ejs", { user: { id: user_id }, posts });
        });
    });
});

app.get("/about", (req, res) => {
    const user = req.session?.user || null;
    res.render("./posts/about.ejs", { user });
});

app.get("/user/:id", (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM users WHERE id = ?";
    connection.query(query, [id], (err, result) => {
        if (err) return res.status(500).send("Database error");
        const user = result[0];
        const postsQuery = "SELECT * FROM posts WHERE user_id = ?";
        connection.query(postsQuery, [user.id], (err, posts) => {
            if (err) return res.status(500).send("Database error");
            res.render("./posts/user.ejs", { user, posts });
        });
    });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const query = "SELECT * FROM users WHERE username = ?";
    connection.query(query, [username], (err, result) => {
        if (err) return res.status(500).send("Database error");
        if (result.length === 0) return res.send("User not found");
        const user = result[0];
        if (user.password !== password) {
            return res.render("./posts/forgot-password.ejs", { user });
        }
        const postsQuery = "SELECT * FROM posts WHERE user_id = ?";
        connection.query(postsQuery, [user.id], (err, posts) => {
            if (err) return res.status(500).send("Database error");
            res.render("./posts/user.ejs", { user, posts });
        });
    });
});

app.get("/forgot-password", (req, res) => {
    res.render("./posts/forgot-password.ejs");
});

app.post("/forgot-password", (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) return res.send("Username and new password required");
    const query = "UPDATE users SET password = ? WHERE username = ?";
    connection.query(query, [newPassword, username], (err, result) => {
        if (err) return res.status(500).send("Database error");
        if (result.affectedRows === 0) return res.send("No user found with that username");
        res.send("Password updated successfully! <a href='/loginpage'>Login now</a>");
    });
});

app.listen(8080, () => {
    console.log("Listening at port 8080");
});
