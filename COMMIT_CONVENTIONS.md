# 📖 Commit Message Conventions

Commit message has following structure:

type(scope - optional): short summary -it has to start with 'PTBASS-\*\*\*\*' (it represents a ticket number)

[optional body]

[optional footer(s)]

## ✅ Good examples of commit messages

feat(auth): PTBASS-1234 implement JWT refresh token

fix(ui): PTBASS-1234 button not clickable in Safari

docs(readme): PTBASS-1234 add setup instructions

style: PTBASS-1234 run prettier across project

refactor(core): PTBASS-1234 simplify error handling

perf(api): PTBASS-1234 optimize query with indexes

test: PTBASS-1234 add integration tests for user service

chore(deps): PTBASS-1234 bump react to 18.2.0

## 🚫 Bad examples

fixed bug

stuff

update

changes

final version

## 📝 Body (optional)

Body used for additional explanations **what** and **why** was did.

### Example:

feat(auth): PTBASS-1234 add two-factor authentication

Implemented two-factor authentication using TOTP.
Users can now enable 2FA in their profile settings.
This improves overall account security.

## 📌 Footer (optional)

used for **breaking changes**

### Example:

feat(api): PTBASS-1234 change response format

BREAKING CHANGE: user endpoint now returns id instead of \_id
