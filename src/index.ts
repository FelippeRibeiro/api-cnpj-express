import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/:cnpj", async (req, res) => {
  try {
    const cnpj = req.params.cnpj;
    if (!cnpj) res.status(400).json({ message: "No cnpj provided" });
    const [sefaz, cnpjBiz] = await Promise.all([
      querySefaz(cnpj).catch((e) => {}),
      QueryCnpjBiz(cnpj).catch((e) => {}),
    ]);
    res.status(200).json({
      sefaz,
      cnpjBiz,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});

async function querySefaz(cnpj: string) {
  const { data } = await axios({
    method: "POST",
    url: "https://portal.sefaz.ba.gov.br/scripts/cadastro/cadastroBa/result.asp",
    data: {
      CGC: cnpj,
      sefp: "1",
      estado: "BA",
      B1: "CNPJ ->",
      CPF: "",
      IE: "",
    },
    headers: {
      // Host: "www.sefaz.ba.gov.br",
      // "Content-Length": "58",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const $ = cheerio.load(data);
  interface Obj {
    [key: string]: string;
  }
  const sefazDatas: Obj = $("#Table5 > tbody")
    .children()
    .text()
    .split("\n")
    .map((el) => {
      return el.trim();
    })
    .filter((el) => el.length > 1)
    .reduce((acc: Obj, curr: string) => {
      const [key, value] = curr.split(":").map((str) => str.trim());
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});
  return sefazDatas;
}

const desajableFields = [
  "CNPJ",
  "Razão Social",
  "Data da Abertura",
  "Porte",
  "Situação",
  "Data Situação Cadastral",
  "Motivo Situação Cadastral",
  "Telefone(s)",
  "Logradouro",
  "Complemento",
  "Bairro",
  "CEP",
  "Município",
  "Estado",
  "Para correspondência",
  "Principal",
];

async function QueryCnpjBiz(cnpj: string) {
  const contents: string[] = [];
  const results: any = {};
  const Results: any = {};

  const { data } = await axios.get(`https://cnpj.biz/${cnpj}`);
  const $ = await cheerio.load(data);

  $(".column-1")
    .children()
    .each((i, el) => {
      if (el.name != "script") {
        contents.push($(el).text().trim());
      }
    });

  contents.forEach((index) => {
    const [field, ...value] = index.split(":");
    results[field] = value.join().trim();
    results[field] ? undefined : (results[field] = "Não Encontrado");
  });

  desajableFields.forEach((field) => {
    Results[field] = results[field] || "Não encontrado";
    //fs.appendFileSync("result.txt", `${field} : ${results[field] || "Não encontrado"}\n`);
    // console.log(`${field} : ${results[field]}\n`);
  });
  return Results;
}
