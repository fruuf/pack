import helloTemplate from "./hello.pug"
import "./hello.less"

container = document.createElement "div"
document.body.appendChild container

container.innerHTML = helloTemplate { message: "hello "}
