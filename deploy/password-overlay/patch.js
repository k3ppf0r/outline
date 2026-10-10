"use strict";

const fs = require("node:fs");

const helperPath =
  "/opt/outline/build/server/models/helpers/AuthenticationHelper.js";
const userPath = "/opt/outline/build/server/models/User.js";

const helper = fs.readFileSync(helperPath, "utf8");
const passwordFilter = `            // Password sign-in is only offered after a workspace exists.
            if (hook.value.id === "password") {
                return !!team;
            }
            // Passkeys is an exception as it does not have an authentication
`;

if (helper.includes('hook.value.id === "password"')) {
  console.log("AuthenticationHelper already patched");
} else {
  const needle =
    '            // Passkeys is an exception as it does not have an authentication\n';
  if (!helper.includes(needle)) {
    throw new Error("AuthenticationHelper patch point not found");
  }
  fs.writeFileSync(helperPath, helper.replace(needle, passwordFilter));
  console.log("Patched AuthenticationHelper");
}

const user = fs.readFileSync(userPath, "utf8");
if (user.includes('"passwordDigest"')) {
  console.log("User model already patched");
} else {
  const emailEnd = '], User.prototype, "email", void 0);';
  if (!user.includes(emailEnd)) {
    throw new Error("User passwordDigest patch point not found");
  }
  const digestBlock = `${emailEnd}
_ts_decorate([
    _sequelizetypescript.AllowNull,
    (0, _sequelizetypescript.Column)(_sequelizetypescript.DataType.STRING),
    _Changeset.SkipChangeset
], User.prototype, "passwordDigest", void 0);`;
  fs.writeFileSync(userPath, user.replace(emailEnd, digestBlock));
  console.log("Patched User model");
}
