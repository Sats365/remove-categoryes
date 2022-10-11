const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const matter = require("gray-matter");

function directoryPath(path = "") {
  return path.match(/(.+)[\/\\]/)?.[1] ?? "";
}

function toAbsolute(uri) {
  return path.join(process.cwd(), "../", uri);
}

function exists(uri) {
  return fs.existsSync(toAbsolute(uri));
}

function del(uri) {
  const path = toAbsolute(uri);
  if (fs.existsSync(path)) fs.unlinkSync(path);
}

function write(uri, data) {
  const path = toAbsolute(uri);
  if (fs.existsSync(path)) fs.writeFileSync(path, data, "utf-8");
  else {
    fs.mkdirSync(directoryPath(path), { recursive: true });
    fs.writeFileSync(path, data, { encoding: "utf-8", flag: "wx" });
  }
}

function read(uri) {
  const path = toAbsolute(uri);
  if (fs.existsSync(path)) return fs.readFileSync(path, "utf-8");
  return "";
}

function getItems(uri) {
  let files = fs.readdirSync(toAbsolute(uri));
  return files
    .map((name) => {
      let stat = fs.lstatSync(toAbsolute(path.join(uri, name)));
      if (!stat.isFile() && !stat.isDirectory()) return null;
      return {
        path: path.join(uri, name),
        isFolder: stat.isDirectory(),
        name,
      };
    })
    .filter((u) => u);
}

function parseYaml(content) {
  return yaml.load(content);
}

function parseYamlToStrs(props) {
  const p = { ...props };
  if (p.lang == "ru") delete p.lang;
  return yaml.dump(p, { quotingType: '"' });
}

function saveIndex(item) {
  const text = `---\n${parseYamlToStrs(item.props)}---\n` + item.content;

  write(item.path, text);
}

function isCategory(item) {
  return item.name == ".category.yaml";
}

function replace(item) {
  const yamlContent = read(item.path);
  const yamlProps = parseYaml(yamlContent);

  const indexItem = {
    path: path.join(directoryPath(item.path), "_index.md"),
    props: yamlProps,
    content: "",
  };

  if (exists(indexItem.path)) {
    md = matter(read(indexItem.path), {});
    indexItem.content = md.content;
    const order = indexItem.props?.order ?? 0;
    indexItem.props = { ...indexItem.props, ...md.data };
    if (order) indexItem.order = order;
  }

  saveIndex(indexItem);
  del(item.path);
  console.log({
    detele: item.path,
    save: indexItem.path,
  });
}

function findAndReplace(items = getItems("/")) {
  const mainItems = items;
  mainItems.forEach((item) => {
    if (item.isFolder) findAndReplace(getItems(item.path));
    else if (isCategory(item)) {
      replace(item);
    }
  });
}

findAndReplace();
