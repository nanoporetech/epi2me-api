export default gqlUtils;
declare namespace gqlUtils {
    export { VERSION as version };
    export function setHeaders(req: any, optionsIn: any): void;
}
import { version as VERSION } from "../package.json";
