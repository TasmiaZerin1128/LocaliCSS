import api from "../api";

const downloadResults = async () => {
    try {
        const response = await api.get(`/download/failures`);
        console.log(response.data);
        return await response.data;
    } catch (err) {
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
    } catch (err) {
        return err.response;
    }
}


export { downloadResults, downloadZipResults };