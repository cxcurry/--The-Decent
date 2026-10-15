import { db, sqlite } from "../lib/db";
import { questions } from "../lib/questions";
import { questionTable, answerTable } from "../lib/schema";
import { count, inArray } from "drizzle-orm";
const ids = questions.map((q) => q.id);
console.log(
  db
    .select({ questions: count() })
    .from(questionTable)
    .where(inArray(questionTable.id, ids))
    .get(),
);
console.log(
  db
    .select({ answers: count() })
    .from(answerTable)
    .where(inArray(answerTable.questionId, ids))
    .get(),
);
console.log("Everyday edition ready. Previous results are preserved.");
sqlite.close();
