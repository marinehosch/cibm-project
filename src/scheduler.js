import cron from "node-cron";
import { main } from "./webscraping.js";

cron.schedule("0 0 1 * *", () => {
  console.log("Exécution de la tâche planifiée...");
  main();
});
