export async function getFoldersAndContents() {
    // const apiUrl = "https://spilt-data-backend.vercel.app/exercises";
    const apiUrl = "http://localhost:9000/exercises";
  
    try {
      const response = await fetch(apiUrl);
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      const { folders, exercises } = data;
  
      return { folders, exercises };
    } catch (error) {
      console.error("Error while getting folder names and contents:", error);
      return { folders: [], exercises: [] };
    }
  }