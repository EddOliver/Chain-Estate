"use server"

export async function getMetadata(url) {
    try{
        const response = await fetch(url);
        const metadata = await response.json();
        return metadata;
    }
    catch(error){
        return null;
    }
}
