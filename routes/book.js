
var express = require('express');
const db = require('../db');
var router = express.Router();

router.get('/list', async (req, res)=>{
  try {
    const result = await db.query('SELECT id, title, author FROM Book');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

/* Delete a specific book */
router.delete('/:id', async (req, res) => {
  const bookId = req.params.id;
  console.log(`Deleting book with id ${bookId}`);
  try {
    const result = await db.query("DELETE FROM Book WHERE id = $1 RETURNING *", [bookId]);
    if (result.rowCount === 0) {
      res.status(404).send('Book not found');
    } else {
      res.json({ message: 'Book deleted successfully', book: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

/* Add a new book */
router.post('/', async (req, res) => {
  const { title, author, isbn, quantity, shelf_location } = req.body;
  
  // Validate input
  if (!title || !author || !isbn || quantity === undefined || !shelf_location) {
    return res.status(400).send('All fields (title, author, isbn, quantity, shelf_location) are required.');
  }

  try {
    const result = await db.query(
      'INSERT INTO Book (title, author, isbn, quantity, shelf_location) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, author, isbn, quantity, shelf_location]
    );
    res.status(201).json({ message: 'Book added successfully', book: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


/* Update an existing book */
router.put('/:id', async (req, res) => {
  const bookId = req.params.id;
  const { title, author, isbn, quantity, shelf_location } = req.body;

  // Check if at least one field is provided for updating
  if (!title && !author && !isbn && quantity === undefined && !shelf_location) {
    return res.status(400).send('At least one field (title, author, isbn, quantity, shelf_location) must be provided for update.');
  }

  try {
    // Construct the dynamic update query
    const fields = [];
    const values = [];
    let index = 1;

    if (title) {
      fields.push(`title = $${index++}`);
      values.push(title);
    }
    if (author) {
      fields.push(`author = $${index++}`);
      values.push(author);
    }
    if (isbn) {
      fields.push(`isbn = $${index++}`);
      values.push(isbn);
    }
    if (quantity !== undefined) {
      fields.push(`quantity = $${index++}`);
      values.push(quantity);
    }
    if (shelf_location) {
      fields.push(`shelf_location = $${index++}`);
      values.push(shelf_location);
    }

    values.push(bookId); // Add the book ID as the last parameter

    const query = `UPDATE Book SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).send('Book not found');
    }

    res.json({ message: 'Book updated successfully', book: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

/* Search for books by title, author, or ISBN */
router.get('/search', async (req, res) => {
  const { title, author, isbn } = req.query;

  // Check if at least one search parameter is provided
  if (!title && !author && !isbn) {
    return res.status(400).send('At least one query parameter (title, author, or ISBN) must be provided for searching.');
  }

  try {
    const conditions = [];
    const values = [];
    let index = 1;

    // Add conditions dynamically based on query parameters
    if (title) {
      conditions.push(`title ILIKE $${index++}`);
      values.push(`%${title}%`);
    }
    if (author) {
      conditions.push(`author ILIKE $${index++}`);
      values.push(`%${author}%`);
    }
    if (isbn) {
      conditions.push(`isbn = $${index++}`);
      values.push(isbn);
    }

    // Construct the SQL query
    const query = `
      SELECT id, title, author, isbn, quantity, shelf_location 
      FROM Book 
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).send('No books found matching the criteria.');
    }

    res.json({ books: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
