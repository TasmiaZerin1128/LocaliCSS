import api from "../api";

const downloadResults = async (file: string) => {
    try {
        const response = await api.get(`/download/result/${file}`);
        console.log(response.data);
        return await response.data;
    } catch (err: any) {
        return err.response;
    }
}

const downloadZipResults = async () => {
    try {
        const response = await api.get(`/download/zip/failures`, {
            responseType: 'arraybuffer',
          });
        console.log(response.data);
        return await response.data;
    } catch (err: any) {
        return err.response;
    }
}


export { downloadResults, downloadZipResults };