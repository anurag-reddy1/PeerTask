// server/config/passport.js
// -----------------------------------------------------------------------------
// Passport configuration: session-based auth using the passport-local strategy.
//
// Auth flow (also documented in README):
//   1. Login route calls passport.authenticate('local').
//   2. The strategy below looks the user up by email and bcrypt-compares the
//      submitted password against the stored passwordHash.
//   3. On success passport calls serializeUser -> we store ONLY the user _id in
//      the session (kept server-side by express-session, referenced by a cookie).
//   4. On every subsequent request deserializeUser turns that _id back into a
//      full user object (minus the passwordHash) attached to req.user.
// -----------------------------------------------------------------------------
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { collections } from "./db.js";

export function configurePassport(passport) {
  // ---- Local strategy: authenticate with email + password -------------------
  passport.use(
    new LocalStrategy(
      // We use email (not the default "username") as the login identifier.
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await collections
            .users()
            .findOne({ email: String(email).toLowerCase().trim() });

          // Use the same generic message for "no user" and "wrong password" so
          // we don't leak which emails are registered.
          if (!user) {
            return done(null, false, { message: "Invalid email or password." });
          }

          // bcrypt.compare hashes the candidate with the stored salt and does a
          // constant-time comparison against the stored hash.
          const match = await bcrypt.compare(password, user.passwordHash);
          if (!match) {
            return done(null, false, { message: "Invalid email or password." });
          }

          // Success — pass the user to serializeUser.
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // ---- Session serialization ------------------------------------------------
  // Store just the id string in the session to keep the cookie/session small.
  passport.serializeUser((user, done) => {
    done(null, user._id.toString());
  });

  // On each request, rehydrate req.user from the stored id. We PROJECT AWAY the
  // passwordHash so it can never accidentally leak through req.user.
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await collections
        .users()
        .findOne(
          { _id: new ObjectId(id) },
          { projection: { passwordHash: 0 } }
        );
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });
}
