import { sqlite } from "../lib/db";
console.log(
  sqlite.prepare("SELECT count(*) AS questions FROM questions").get(),
);
console.log(sqlite.prepare("SELECT count(*) AS answers FROM answers").get());
sqlite.close();
