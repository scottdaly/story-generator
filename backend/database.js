const Database = require("better-sqlite3");
const path = require("path");

// Initialize database
const db = new Database(path.join(__dirname, "stories.db"));

// Create stories table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT,
    genre TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create a prepared statement for inserting stories
const insertStory = db.prepare(`
  INSERT INTO stories (user_id, title, genre, content)
  VALUES (@user_id, @title, @genre, @content)
`);

// Create a prepared statement for getting user's stories
const getUserStories = db.prepare(`
  SELECT * FROM stories 
  WHERE user_id = @user_id 
  ORDER BY created_at DESC
`);

// Create a prepared statement for getting a single story
const getStory = db.prepare(`
  SELECT * FROM stories 
  WHERE id = @id AND user_id = @user_id
`);

// Create a prepared statement for updating a story
const updateStory = db.prepare(`
  UPDATE stories 
  SET title = @title, 
      genre = @genre, 
      content = @content,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = @id AND user_id = @user_id
`);

// Create a prepared statement for deleting a story
const deleteStory = db.prepare(`
  DELETE FROM stories 
  WHERE id = @id AND user_id = @user_id
`);

module.exports = {
  // Save a new story
  saveStory: (user_id, title, genre, content) => {
    return insertStory.run({ user_id, title, genre, content });
  },

  // Get all stories for a user
  getStories: (user_id) => {
    return getUserStories.all({ user_id });
  },

  // Get a single story
  getStory: (id, user_id) => {
    return getStory.get({ id, user_id });
  },

  // Update a story
  updateStory: (id, user_id, title, genre, content) => {
    return updateStory.run({ id, user_id, title, genre, content });
  },

  // Delete a story
  deleteStory: (id, user_id) => {
    return deleteStory.run({ id, user_id });
  },
};
