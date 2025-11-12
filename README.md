# Drut - AI Learning App

This document provides the necessary setup instructions for the Drut application's database.

## Supabase Database Setup

The application requires a specific database schema to handle user accounts, persist practice attempts, and calculate analytics. The following SQL script will set up all necessary tables, security policies, and server-side functions.

**IMPORTANT:** You must run this script in your Supabase project's SQL Editor to fix the application's persistence and analytics errors.

### How to Apply the Schema:

1.  Navigate to your Supabase project dashboard.
2.  In the left-hand menu, click on the **SQL Editor** icon.
3.  Click **+ New query**.
4.  Copy the entire content of the `supabase/migrations/0001_initial_schema.sql` file and paste it into the query window.
5.  Click the **RUN** button.

This will correctly initialize your database. After running the script, the application should function as expected.
