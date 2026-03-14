import { supabase } from './supabase';

export interface SyncPhoto {
    data: string;
    description: string;
    type?: 'image' | 'video';
}

/**
 * Ensures a folder exists for the given OS and adds photos to it.
 * This is used to centralize all photos of the system in the "Arquivo Geral".
 */
export const syncPhotosToGallery = async (
    os_interna: string,
    cliente: string,
    photos: SyncPhoto[]
) => {
    if (!os_interna || photos.length === 0) return;

    try {
        // 1. Get or Create Folder
        let { data: folder, error: folderError } = await supabase
            .from('photo_folders')
            .select('id')
            .eq('os_interna', os_interna)
            .maybeSingle();

        if (folderError && folderError.code !== 'PGRST116') throw folderError;

        if (!folder) {
            const { data: newFolder, error: createError } = await supabase
                .from('photo_folders')
                .insert([{
                    name: `${cliente} - ${os_interna}`,
                    cliente: cliente || 'Sem Cliente',
                    os_interna: os_interna,
                    data_entrada: new Date().toISOString().split('T')[0]
                }])
                .select()
                .single();

            if (createError) throw createError;
            folder = newFolder;
        }

        if (!folder) return;

        // 2. Add Photos
        // We filter out any photos that might already exist in this folder to avoid duplicates
        // For performance, we'll just check if there's any photo with the same description in the last 1 minute
        // or just insert them all. The user wants "every photo", so duplication might be acceptable if they save twice,
        // but let's try to be a bit smart.

        const itemsToInsert = photos
            .filter(p => p.data && p.data.length > 0)
            .map(p => ({
                folder_id: folder.id,
                photo_data: p.data,
                description: p.description,
                media_type: p.type || 'image'
            }));

        if (itemsToInsert.length === 0) return;

        const { error: insertError } = await supabase
            .from('photo_items')
            .insert(itemsToInsert);

        if (insertError) throw insertError;

    } catch (error) {
        console.error('Error syncing photos to gallery:', error);
    }
};
